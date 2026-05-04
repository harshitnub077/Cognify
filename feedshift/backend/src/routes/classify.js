import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// V2 Engine Services
import { semanticClassify, EXPANDED_TOPIC_KEYWORDS } from '../services/semanticClassifier.js';
import { enrichVideoMetadata } from '../services/youtubeEnricher.js';
import { classifyWithAgent } from '../agents/classificationAgent.js';
import { analyzeThumbnail } from '../agents/visionAgent.js';
import { computeFinalVerdict } from '../services/scoreFusion.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:8000',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
);

const classificationCache = new Map();
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000;

function generateCacheKey(videoId, userId, interests) {
  const interestsStr = (interests || []).map(i => `${i.topic}:${i.depth}`).sort().join('|');
  const rawKey = `${videoId}_${userId}_${interestsStr}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * POST /classify
 * V2 Multi-Signal Classification Engine
 */
router.post('/', async (req, res) => {
  try {
    const { videoMetadata, profileSnapshot } = req.body;

    if (!videoMetadata || !profileSnapshot || !videoMetadata.videoId || !profileSnapshot.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { videoId } = videoMetadata;
    const { userId, interests, channelTrust = {} } = profileSnapshot;

    const cacheKey = generateCacheKey(videoId, userId, interests);
    const cachedResult = classificationCache.get(cacheKey);
    if (cachedResult && Date.now() < cachedResult.expiresAt) {
      return res.json({ ...cachedResult, fromCache: true });
    }

    // --- PHASE 2: Metadata Enrichment ---
    // Try to get rich metadata. If it fails, fallback to DOM metadata
    const enrichedMeta = await enrichVideoMetadata(videoId);
    const fullMeta = enrichedMeta 
      ? { ...videoMetadata, ...enrichedMeta } 
      : videoMetadata;

    // --- PHASE 1: Semantic Layer (Fast Fail) ---
    const semanticResult = await semanticClassify(fullMeta, profileSnapshot);
    if (semanticResult) {
      // Very high or very low confidence -> short circuit
      logToSupabase(userId, videoId, fullMeta, semanticResult);
      cacheAndReturn(res, cacheKey, semanticResult);
      return;
    }

    // --- PHASE 3 & 4: Deep AI Analysis ---
    // Run LLM and Vision agents in parallel
    const [llmResult, visionResult] = await Promise.all([
      classifyWithAgent(fullMeta, profileSnapshot),
      analyzeThumbnail(fullMeta.thumbnailUrl) // Content script would need to send this
    ]);

    // --- PHASE 5: Score Fusion ---
    // Combine all signals into a final verdict
    const fusionResult = computeFinalVerdict({
      semantic: { score: 0.5 }, // We pass neutral if semantic was uncertain
      llm: llmResult,
      vision: visionResult,
      ytCategory: fullMeta.category,
      channelTrust: channelTrust[fullMeta.channelName?.toLowerCase()] || 50
    });

    const finalResult = {
      verdict: fusionResult.verdict,
      confidence: fusionResult.confidence,
      reason: `Multi-signal fusion score: ${fusionResult.confidence.toFixed(2)}`,
      topicMatch: llmResult.topicMatch || 'None',
      breakdown: fusionResult.breakdown
    };

    logToSupabase(userId, videoId, fullMeta, finalResult);
    cacheAndReturn(res, cacheKey, finalResult);

  } catch (err) {
    console.error('[Classify V2] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function cacheAndReturn(res, cacheKey, result) {
  classificationCache.set(cacheKey, { ...result, expiresAt: Date.now() + CACHE_TTL });
  res.json({ ...result, fromCache: false });
}

function logToSupabase(userId, videoId, meta, result) {
  supabase.from('profiles').select('id').eq('user_id', userId).single()
    .then(({ data }) => {
      if (data) {
        supabase.from('diet_events').insert({
          user_id: data.id,
          video_id: videoId,
          title: meta.title,
          channel: meta.channelName,
          verdict: result.verdict,
          topic_match: result.topicMatch,
          confidence: result.confidence
        }).catch(() => {});
      }
    }).catch(() => {});
}

export default router;
