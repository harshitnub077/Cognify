import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Execute all independent database queries concurrently for maximum speed
    const [profile, recentLogs, agg, consciousItems, streak] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.contentLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.contentLog.aggregate({ where: { userId }, _count: { _all: true }, _sum: { score: true } }),
      prisma.contentLog.count({ where: { userId, isConscious: true } }),
      prisma.streak.findFirst({ where: { userId } })
    ]);

    const totalItems = agg._count._all || 0;
    const consciousPercentage = totalItems > 0 ? Math.round((consciousItems / totalItems) * 100) : 0;
    const avgScore = totalItems > 0 ? Math.round((agg._sum.score || 0) / totalItems) : 0;

    res.json({
        profile: profile ? { ...profile, identities: profile.focusAreas || [] } : null,
        stats: {
            consciousPercentage,
            avgScore,
            totalAnalyzed: totalItems,
            streak: streak?.currentCount || 0,
            bestStreak: streak?.bestCount || 0
        },
        // Map contentType → platform for frontend compatibility
        recentLogs: recentLogs.map(log => ({
            ...log,
            platform: log.contentType
        }))
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
