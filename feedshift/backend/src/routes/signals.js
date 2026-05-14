import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:8000',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'dummy_supabase_key'
);

/**
 * Applies learning signal logic to update trust scores and topics.
 * @param {Object} profile - The user's current profile.
 * @param {Object} signalData - The learning signal data.
 * @returns {Object} Updated trustScore, confirmedTopics, and blockedTopics.
 */
function applySignalLogic(profile, signalData) {
  let { trust_score = 50, confirmed_topics = [], blocked_topics = [] } = profile;
  const { type, watchPercent = 0, titleKeywords = [] } = signalData;


  // Clone arrays to mutate
  confirmed_topics = [...(confirmed_topics || [])];
  blocked_topics = [...(blocked_topics || [])];


  // Apply logic based on signal type
  if (type === 'USER_ALLOWED') {
    trust_score += 15;
    if (Array.isArray(titleKeywords)) {
      confirmed_topics.push(...titleKeywords);
    }
  } else if (type === 'USER_BLOCKED') {
    trust_score -= 20;
    if (Array.isArray(titleKeywords)) {
      blocked_topics.push(...titleKeywords);
    }
  } else if (type === 'WATCH_TIME') {
    trust_score = (0.7 * trust_score) + (0.3 * (watchPercent * 100));
  } else if (type === 'SKIP') {
    trust_score -= 3;
  }


  // Clamp trust score between 0 and 100
  trust_score = Math.max(0, Math.min(100, Math.round(trust_score)));

  // Deduplicate and trim topics to max 50 entries
  confirmed_topics = [...new Set(confirmed_topics)].slice(-50);
  blocked_topics = [...new Set(blocked_topics)].slice(-50);

  return { trust_score, confirmed_topics, blocked_topics };
}

/**
 * POST /signal
 * Body: { userId, signal: LearningSignal }
 * Response: { updated: boolean, newTrustScore?: number }
 */
router.post('/', async (req, res) => {
  try {
    const { userId, signal } = req.body;

    if (!userId || !signal || !signal.type) {
      return res.status(400).json({ error: 'Missing userId or signal data' });
    }

    // 1. Load user profile from Supabase
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile for signal:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
    
    // If no profile, use default baseline
    const currentProfile = profile || { trust_score: 50, confirmed_topics: [], blocked_topics: [] };

    // 2, 3, 4. Apply signal logic, clamp score, and trim topics
    const { trust_score, confirmed_topics, blocked_topics } = applySignalLogic(currentProfile, signal);

    // 5. Update profile in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        trust_score,
        confirmed_topics,
        blocked_topics,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (updateError) {
      console.error('Error updating profile with signal:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // 6. Return new channel trust score
    res.json({ updated: true, newTrustScore: trust_score });

  } catch (err) {
    console.error('Error in /signal route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

