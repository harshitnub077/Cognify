import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Mock recommendation data
const generateMockRecommendations = (goal: string, limit: number) => {
  const platforms = ['youtube', 'youtube', 'youtube', 'instagram', 'twitter'];
  const emotions = ['joy', 'surprise', 'neutral', 'joy', 'fear'];
  
  const items = [];
  for(let i=0; i<limit; i++) {
    const score = 0.7 + (Math.random() * 0.25); // high scores for recommendations
    items.push({
      id: `rec-${Math.random().toString(36).substr(2, 9)}`,
      title: `The Ultimate Guide to becoming a ${goal} in 2026`,
      channel: `Creator Studio ${i+1}`,
      thumbnail: `https://images.unsplash.com/photo-1${Math.floor(Math.random()*99999)}?w=400&q=80`,
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      duration: `${Math.floor(Math.random() * 20) + 5}:${Math.floor(Math.random() * 50) + 10}`,
      viewCount: `${Math.floor(Math.random() * 900) + 10}K views`,
      score: score,
      dominantEmotion: emotions[Math.floor(Math.random() * emotions.length)],
      emotions: { joy: 0.8, surprise: 0.1, neutral: 0.1 },
      reason: `This heavily aligns with your goal of being a ${goal} by focusing on deep execution.`
    });
  }
  return items;
};

// Get recommendations
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const goal = req.query.goal || 'Focused Thinker';
    const limit = parseInt(req.query.limit) || 8;
    
    // In production, this would call Python NLP to filter YouTube search results
    const recommendations = generateMockRecommendations(goal, limit);
    
    // Slight delay to simulate NLP crunching
    setTimeout(() => {
      res.json({ data: recommendations });
    }, 800);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

export default router;
