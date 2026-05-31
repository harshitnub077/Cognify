import express from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { mapProfileToClient } from '../utils/mappers.js';

dotenv.config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:8000',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'dummy_supabase_key'
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

/**
 * GET /profile/:userId
 * Returns profile from Supabase
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(mapProfileToClient(profile));
  } catch (err) {
    console.error('Error in GET /profile/:userId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /profile
 * Creates or updates profile in Supabase
 */
router.post('/', async (req, res) => {
  try {
    const { userId, ...profileData } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      return res.status(500).json({ error: 'Failed to save profile' });
    }

    res.json(mapProfileToClient(data));
  } catch (err) {
    console.error('Error in POST /profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /profile/:userId
 * Soft delete by setting deleted_at timestamp
 */
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting profile:', error);
      return res.status(500).json({ error: 'Failed to delete profile' });
    }

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
    
    // Fetch profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('interests, interest_keywords')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const interests = profile.interests || [];
    if (interests.length === 0) {
      return res.json({ interest_keywords: {} });
    }

    const interest_keywords = profile.interest_keywords || {};
    let updated = false;

    // Iterate through all interests and generate keywords for any that are missing
    for (const interest of interests) {
      const topic = interest.topic;
      const depth = interest.depth || 'intermediate';

      if (interest_keywords[topic] && interest_keywords[topic].length > 0) {
        continue; // Already generated
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
      }
    }

    // Save updated keywords back to profile in Supabase
    if (updated) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ interest_keywords })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to save interest keywords:', updateError);
      }
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
      }
    }

    // Save to Supabase
    if (Object.keys(interest_keywords).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ interest_keywords })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to save interest keywords:', updateError);
      }
    }

    res.json({ interest_keywords });
  } catch (err) {
    console.error('Error in POST /profile/generate-keywords:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
