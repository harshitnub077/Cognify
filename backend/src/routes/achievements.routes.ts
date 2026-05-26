import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

const XP_MAP: Record<string, number> = {
  'first_analysis': 100,
  'streak_7': 500,
  'streak_30': 2000,
  'streak_100': 10000,
  'drift_positive_3': 1500,
  'toxic_reducer': 1000,
  'goal_aligned_week': 800,
  'coach_session_5': 500,
  'echo_buster': 1200
};

router.get('/', requireAuth, async (req: any, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { userId: req.user.id }
    });
    
    // Calculate total XP and level
    const totalXP = achievements.reduce((sum, a) => sum + (XP_MAP[a.type] || 0), 0);
    const level = Math.max(1, Math.floor(Math.sqrt(totalXP / 100)));

    res.json({ data: achievements, totalXP, level });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

export default router;
