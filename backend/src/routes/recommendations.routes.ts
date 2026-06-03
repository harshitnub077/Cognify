import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import axios from 'axios';

const router = Router();

// Get recommendations
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const goal = req.query.goal || 'Focused Thinker';
    const limit = parseInt(req.query.limit) || 8;
    
    // Call Python NLP to generate hyper-specific recommendations using Gemini
    const nlpResponse = await axios.post('http://localhost:8001/recommend', {
      goal,
      limit
    });
    
    // Map the NLP output to include mock images/metadata for the UI
    const platforms = ['youtube'];
    const emotions = ['joy', 'surprise', 'neutral'];
    
    const recommendations = nlpResponse.data.data.map((item: any) => ({
      id: `rec-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title,
      channel: item.channel,
      url: item.url,
      thumbnail: item.thumbnail || `https://images.unsplash.com/photo-1${Math.floor(Math.random()*99999)}?w=400&q=80`,
      platform: 'youtube',
      duration: item.duration,
      viewCount: item.viewCount,
      score: item.score,
      dominantEmotion: emotions[Math.floor(Math.random() * emotions.length)],
      emotions: { joy: 0.8, surprise: 0.1, neutral: 0.1 },
      reason: item.reason
    }));

    res.json({ data: recommendations });
  } catch (error) {
    console.error('Failed to fetch recommendations from NLP', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

export default router;
