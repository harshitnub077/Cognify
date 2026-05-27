import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/annual', requireAuth, async (req: any, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const userId = req.user.id;
    
    // In a real system, we aggregate across the DB for the given year.
    // For presentation/demo, we return a structured summary object.
    const reportData = {
      year,
      total_content_analyzed: 847,
      total_hours_saved: 23,
      average_goal_alignment: 0.67,
      best_week: { week: 34, alignment: 0.91 },
      worst_week: { week: 12, alignment: 0.21 },
      most_watched_platform: "YouTube",
      top_positive_emotion: "joy",
      top_avoided_emotion: "anger",
      drift_trend: "improving",
      achievements_unlocked: 11,
      longest_streak: 47,
      identity_progress: { 
        "Deep Thinker": 0.78, 
        "Mindful Creator": 0.65,
        "Empathetic Leader": 0.42
      }
    };
    
    res.json({ data: reportData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate annual report' });
  }
});

export default router;
