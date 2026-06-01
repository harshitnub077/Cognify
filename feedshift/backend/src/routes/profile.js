import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getProfile, upsertProfile, deleteProfile } from '../services/profileStore.js';

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

/**
 * GET /profile/:userId
 * Returns profile from Supabase or local offline fallback
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await getProfile(userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (err) {
    console.error('Error in GET /profile/:userId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /profile
 * Creates or updates profile in Supabase or local offline fallback
 */
router.post('/', async (req, res) => {
  try {
    const { userId, ...profileData } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const data = await upsertProfile({ userId, ...profileData });
    res.json(data);
  } catch (err) {
    console.error('Error in POST /profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /profile/:userId
 * Soft delete or remove from offline fallback
 */
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await deleteProfile(userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /profile/:userId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /profile/:userId/keywords
 * Return AI-generated keywords for each interest topic
 */
router.get('/:userId/keywords', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch profile using helper
    const profile = await getProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const interests = profile.interests || [];
    if (interests.length === 0) {
      return res.json({ interest_keywords: {} });
    }

    const interest_keywords = profile.interestKeywords || {};
    let updated = false;

    // Iterate through all interests and generate keywords for any that are missing
    for (const interest of interests) {
      const topic = interest.topic;
      const depth = interest.depth || 'intermediate';

      if (interest_keywords[topic] && interest_keywords[topic].length > 0) {
        continue; // Already generated
      }

      // If OpenAI key is missing or dummy, use static keywords to avoid breaking the UI
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('dummy_key')) {
        interest_keywords[topic] = [topic.toLowerCase(), `${topic.toLowerCase()} tutorial`, `learn ${topic.toLowerCase()}`];
        updated = true;
        continue;
      }

      try {
        const prompt = `Generate 15 YouTube search terms that someone interested in ${topic} at ${depth} level would search for. Return as JSON array of strings under the key "keywords".`;
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 200,
          temperature: 0.7,
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        if (parsed.keywords && Array.isArray(parsed.keywords)) {
          interest_keywords[topic] = parsed.keywords;
          updated = true;
        }
      } catch (aiError) {
        console.error(`Failed to generate keywords for topic ${topic}:`, aiError);
        interest_keywords[topic] = [topic.toLowerCase(), `${topic.toLowerCase()} tutorial`, `learn ${topic.toLowerCase()}`];
        updated = true;
      }
    }

    // Save updated keywords back to profile using helper
    if (updated) {
      profile.interestKeywords = interest_keywords;
      await upsertProfile(profile);
    }

    res.json({ interest_keywords });
  } catch (err) {
    console.error('Error in GET /profile/:userId/keywords:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /profile/generate-keywords
 * AI-powered interest keyword pre-generation
 */
router.post('/generate-keywords', async (req, res) => {
  try {
    const { userId, interests } = req.body;
    
    if (!userId || !Array.isArray(interests)) {
      return res.status(400).json({ error: 'Missing userId or valid interests array' });
    }

    const interest_keywords = {};

    for (const interest of interests) {
      const topic = interest.topic;
      const depth = interest.depth || 'intermediate';

      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('dummy_key')) {
        interest_keywords[topic] = [topic.toLowerCase(), `${topic.toLowerCase()} tutorial`, `learn ${topic.toLowerCase()}`];
        continue;
      }

      try {
        const prompt = `The user is interested in '${topic}' at '${depth}' level. Generate exactly 20 YouTube search keywords that someone at this level would search for. Include: specific sub-topics, common terminology, relevant channel types, key concepts. Return ONLY a JSON array of strings under the key "keywords". No explanations.`;
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 250,
          temperature: 0.7,
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        if (parsed.keywords && Array.isArray(parsed.keywords)) {
          interest_keywords[topic] = parsed.keywords.map(k => k.toLowerCase());
        }
      } catch (aiError) {
        console.error(`Failed to generate keywords for topic ${topic}:`, aiError);
        interest_keywords[topic] = [topic.toLowerCase(), `${topic.toLowerCase()} tutorial`, `learn ${topic.toLowerCase()}`];
      }
    }

    // Save to database using helper
    if (Object.keys(interest_keywords).length > 0) {
      const profile = await getProfile(userId) || { userId };
      profile.interestKeywords = interest_keywords;
      await upsertProfile(profile);
    }

    res.json({ interest_keywords });
  } catch (err) {
    console.error('Error in POST /profile/generate-keywords:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
