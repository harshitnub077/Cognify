import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Fetch user profile
    const profile = await prisma.userProfile.findUnique({
        where: { userId }
    });

    // Calculate aggregated stats from ContentLogs
    const logs = await prisma.contentLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    const totalItems = logs.length;
    const consciousItems = logs.filter(l => l.isConscious).length;
    const consciousPercentage = totalItems > 0 ? Math.round((consciousItems / totalItems) * 100) : 0;
    
    // Calculate average score
    const avgScore = totalItems > 0 
        ? Math.round(logs.reduce((acc, log) => acc + log.score, 0) / totalItems)
        : 0;

    // Fetch Streak
    const streak = await prisma.streak.findFirst({
        where: { userId }
    });

    res.json({
        profile,
        stats: {
            consciousPercentage,
            avgScore,
            totalAnalyzed: totalItems,
            streak: streak?.currentCount || 0,
            bestStreak: streak?.bestCount || 0
        },
        recentLogs: logs.slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
