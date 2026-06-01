import express from 'express';
import dotenv from 'dotenv';
import { getProfile, upsertProfile } from '../services/profileStore.js';

dotenv.config();

const router = express.Router();

/**
 * Applies learning signal logic to update trust scores and topics.
 * @param {Object} profile - The user's current profile.
 * @param {Object} signalData - The learning signal data.
 * @returns {Object} Updated trustScore, confirmedTopics, and blockedTopics.
 */
function applySignalLogic(profile, signalData) {
  let { trustScore = 50, confirmedTopics = [], blockedTopics = [] } = profile;
  const { type, watchPercent = 0, titleKeywords = [] } = signalData;

  // Clone arrays to mutate safely
  confirmedTopics = [...(confirmedTopics || [])];
  blockedTopics = [...(blockedTopics || [])];

  // Apply logic based on signal type
  if (type === 'USER_ALLOWED') {
    trustScore += 15;
    if (Array.isArray(titleKeywords)) {
      confirmedTopics.push(...titleKeywords);
    }
  } else if (type === 'USER_BLOCKED') {
    trustScore -= 20;
    if (Array.isArray(titleKeywords)) {
      blockedTopics.push(...titleKeywords);
    }
  } else if (type === 'WATCH_TIME') {
    trustScore = (0.7 * trustScore) + (0.3 * (watchPercent * 100));
  } else if (type === 'SKIP') {
    trustScore -= 3;
  }

  // Clamp trust score between 0 and 100
  trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));

  // Deduplicate and trim topics to max 50 entries
  confirmedTopics = [...new Set(confirmedTopics)].slice(-50);
  blockedTopics = [...new Set(blockedTopics)].slice(-50);

  return { trustScore, confirmedTopics, blockedTopics };
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

    // 1. Load user profile from profileStore
    const profile = await getProfile(userId);
    
    // If no profile, use default baseline
    const currentProfile = profile || { userId, trustScore: 50, confirmedTopics: [], blockedTopics: [] };

    // 2. Apply signal logic, clamp score, and trim topics
    const { trustScore, confirmedTopics, blockedTopics } = applySignalLogic(currentProfile, signal);

    // Update profile object properties
    currentProfile.trustScore = trustScore;
    currentProfile.confirmedTopics = confirmedTopics;
    currentProfile.blockedTopics = blockedTopics;

    // 3. Update profile in database using helper
    await upsertProfile(currentProfile);

    // 4. Return new channel trust score
    res.json({ updated: true, newTrustScore: trustScore });

  } catch (err) {
    console.error('Error in /signal route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
