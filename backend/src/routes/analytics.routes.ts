import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import axios from 'axios';

const router = Router();

router.get('/emotion-timeline', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user.id;
        
        // Date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await prisma.contentLog.findMany({
            where: {
                userId,
                createdAt: { gte: thirtyDaysAgo }
            },
            select: {
                createdAt: true,
                score: true,
                emotions: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Group by day (YYYY-MM-DD)
        const dailyStats: Record<string, any> = {};

        logs.forEach(log => {
            const dateStr = log.createdAt.toISOString().split('T')[0];
            if (!dailyStats[dateStr]) {
                dailyStats[dateStr] = {
                    date: dateStr,
                    joy_sum: 0, anger_sum: 0, fear_sum: 0, sadness_sum: 0,
                    goal_alignment_sum: 0, content_count: 0
                };
            }
            
            const emotions: any = log.emotions || {};
            dailyStats[dateStr].joy_sum += emotions.joy || 0;
            dailyStats[dateStr].anger_sum += emotions.anger || 0;
            dailyStats[dateStr].fear_sum += emotions.fear || 0;
            dailyStats[dateStr].sadness_sum += emotions.sadness || 0;
            dailyStats[dateStr].goal_alignment_sum += log.score;
            dailyStats[dateStr].content_count += 1;
        });

        // Calculate averages — normalized to match frontend expectations
        const timeline = Object.values(dailyStats).map(stat => ({
            date: stat.date,
            averageScore: stat.content_count ? stat.goal_alignment_sum / stat.content_count / 100 : 0,
            emotions: {
                joy:     stat.content_count ? stat.joy_sum / stat.content_count : 0,
                anger:   stat.content_count ? stat.anger_sum / stat.content_count : 0,
                fear:    stat.content_count ? stat.fear_sum / stat.content_count : 0,
                sadness: stat.content_count ? stat.sadness_sum / stat.content_count : 0,
            },
            content_count: stat.content_count
        }));

        res.json({ success: true, data: timeline });
    } catch (error) {
        console.error('Error fetching emotion timeline:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch timeline data' });
    }
});

router.get('/drift-score', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user.id;
        
        // Return the most recent stored drift score
        const lastScore = await prisma.driftScore.findFirst({
            where: { userId },
            orderBy: { date: 'desc' }
        });

        if (lastScore) {
            return res.json({ 
                success: true, 
                score: lastScore.score, 
                trend: lastScore.trend || 'stable',
                data: lastScore
            });
        }

        // If no score yet, try NLP service
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentLogs = await prisma.contentLog.findMany({
                where: { userId, createdAt: { gte: sevenDaysAgo } },
                select: { isConscious: true, score: true, tags: true }
            });

            const response = await axios.post('http://localhost:8001/drift/calculate', {
                user_id: userId,
                content_logs: recentLogs
            }, { timeout: 5000 });
            const driftData = response.data;

            const newDriftScore = await prisma.driftScore.create({
                data: {
                    userId,
                    score: driftData.drift_score,
                    factors: driftData.breakdown,
                    trend: 'stable'
                }
            });

            return res.json({ success: true, score: newDriftScore.score, trend: 'stable', data: newDriftScore });
        } catch (nlpError) {
            // NLP unavailable — return 0 as default
            return res.json({ success: true, score: 0, trend: 'stable', data: null });
        }
    } catch (error) {
        console.error('Error calculating drift score:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate drift score' });
    }
});

// Blind Spot Detector
router.post('/blind-spot', requireAuth, async (req: any, res) => {
  try {
    // In production, we fetch last 30 days of ContentLog, extract tags/topics, 
    // run NLP clustering, and determine if an echo chamber exists.
    
    // Returning a mocked detection for UI integration
    const detected = Math.random() > 0.5; // 50% chance to simulate detection
    
    if (detected) {
      return res.json({ 
        detected: true, 
        dominant_topic: "Political Commentary", 
        percentage: 72, 
        suggestion: "You've been consuming heavy political commentary from similar viewpoints. Want to explore different angles or switch to educational content?" 
      });
    } else {
      return res.json({ detected: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze blind spots' });
  }
});

export default router;
