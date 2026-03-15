import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { buildClassificationPrompt } from '../utils/promptBuilder.js';
import { classifyWithAI } from '../services/aiClassifier.js';
import { semanticClassify, EXPANDED_TOPIC_KEYWORDS } from '../services/semanticClassifier.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:8000',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
);

// In-memory cache Map (TTL 3 days)
const classificationCache = new Map();
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000;

/**
 * Generates a SHA256 cache key based on videoId, userId, and interests.
 */
function generateCacheKey(videoId, userId, interests) {
  const interestsStr = (interests || []).map(i => `${i.topic}:${i.depth}`).sort().join('|');
  const rawKey = `${videoId}_${userId}_${interestsStr}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * POST /classify
 * Body: { videoMetadata: VideoMetadata, profileSnapshot: ProfileSnapshot }
 * Response: { verdict, confidence, reason, topicMatch, fromCache: boolean }
 */
router.post('/', async (req, res) => {
  try {
    const { videoMetadata, profileSnapshot } = req.body;

    // 1. Validate body
    if (!videoMetadata || !profileSnapshot || !videoMetadata.videoId || !profileSnapshot.userId) {
      return res.status(400).json({ error: 'Missing required fields: videoMetadata and profileSnapshot' });
    }

    const { videoId } = videoMetadata;
    const { userId, interests } = profileSnapshot;

    // 2. Create cache key
    const cacheKey = generateCacheKey(videoId, userId, interests);

    // 3. Check in-memory cache
    const cachedResult = classificationCache.get(cacheKey);
    if (cachedResult) {
      if (Date.now() < cachedResult.expiresAt) {
        return res.json({
          verdict: cachedResult.verdict,
          confidence: cachedResult.confidence,
          reason: cachedResult.reason,
          topicMatch: cachedResult.topicMatch,
          fromCache: true
        });
      } else {
        classificationCache.delete(cacheKey);
      }
    }

    let result;

    try {
      // LAYER 1: Fast semantic similarity check (returns immediately if confident)
      const semanticResult = await semanticClassify(videoMetadata, profileSnapshot);
      if (semanticResult) {
        // High-confidence semantic verdict — skip LLM entirely for speed & cost
        result = semanticResult;
        console.log(`[Classify] Semantic verdict: ${result.verdict} (${result.confidence?.toFixed(2)}) — skipping LLM`);
      } else {
        // LAYER 2: Expanded keyword heuristic (no API needed)
        const titleLower = (videoMetadata.title || '').toLowerCase();
        const descLower = (videoMetadata.description || '').toLowerCase();
        const fullText = titleLower + ' ' + descLower;
        
        let keywordMatch = null;
        for (const interest of (interests || [])) {
          const topicKey = (interest.topic || interest).toLowerCase().trim();
          const keywords = EXPANDED_TOPIC_KEYWORDS[topicKey] || [topicKey];
          const matched = keywords.find(kw => fullText.includes(kw));
          if (matched) { keywordMatch = { topic: interest.topic || interest, keyword: matched }; break; }
        }

        if (keywordMatch) {
          result = { verdict: 'ALLOW', confidence: 0.82, reason: `Keyword match: "${keywordMatch.keyword}"`, topicMatch: keywordMatch.topic };
          console.log(`[Classify] Keyword match: ${result.verdict} — "${keywordMatch.keyword}"`);
        } else {
          // LAYER 3: LLM classification (for uncertain content)
          result = await classifyWithAI(buildClassificationPrompt(profileSnapshot, videoMetadata));
        }
      }
    } catch (aiError) {
      console.error('Classification failed:', aiError);
      return res.json({ verdict: 'BLOCK', confidence: 0.5, reason: 'Classifier error — defaulting to block', topicMatch: 'None', fromCache: false });
    }

    // 8. Store in cache
    classificationCache.set(cacheKey, {
      ...result,
      expiresAt: Date.now() + CACHE_TTL
    });

    // Fire and forget log to Supabase for the dashboard charts
    supabase.from('profiles').select('id').eq('user_id', userId).single()
      .then(({ data: profileRow }) => {
        if (profileRow) {
          supabase.from('diet_events').insert({
            user_id: profileRow.id,
            video_id: videoId,
            title: videoMetadata.title,
            channel: videoMetadata.channelName,
            verdict: result.verdict,
            topic_match: result.topicMatch,
            confidence: result.confidence
          }).catch(err => console.error('Error inserting diet_event:', err));
        }
      })
      .catch(err => console.error('Error fetching profile for diet_event:', err));

    // 9. Return result
    return res.json({
      ...result,
      fromCache: false
    });

  } catch (err) {
    console.error('Error in /classify route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
