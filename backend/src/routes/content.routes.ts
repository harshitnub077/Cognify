import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { analyzeRateLimiter } from '../middleware/rateLimiter';
import axios from 'axios';

const router = Router();

function isValidUrl(urlStr: string): boolean {
    try {
        new URL(urlStr);
        return true;
    } catch {
        return false;
    }
}

async function updateStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const streak = await prisma.streak.findFirst({ where: { userId } });

    if (!streak) {
        await prisma.streak.create({
            data: {
                userId,
                currentCount: 1,
                bestCount: 1,
                lastUpdate: today
            }
        });
        return;
    }

    const lastUpdateDate = new Date(streak.lastUpdate);
    lastUpdateDate.setHours(0, 0, 0, 0);

    if (lastUpdateDate.getTime() === yesterday.getTime()) {
        // Consecutive day
        const newCount = streak.currentCount + 1;
        await prisma.streak.update({
            where: { id: streak.id },
            data: {
                currentCount: newCount,
                bestCount: Math.max(newCount, streak.bestCount),
                lastUpdate: today
            }
        });
    } else if (lastUpdateDate.getTime() < yesterday.getTime()) {
        // Streak broken
        await prisma.streak.update({
            where: { id: streak.id },
            data: {
                currentCount: 1,
                lastUpdate: today
            }
        });
    }
}

router.post('/analyze', requireAuth, analyzeRateLimiter, async (req: AuthRequest, res) => {
  try {
    const { url } = req.body;
    const userId = req.user.id;

    if (!url || !isValidUrl(url)) {
        return res.status(400).json({ success: false, error: 'Valid URL is required' });
    }

    // Cache Check: Did this user analyze this exact URL in the last 24h?
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingLog = await prisma.contentLog.findFirst({
        where: {
            userId,
            url,
            createdAt: { gte: yesterday }
        }
    });

    if (existingLog) {
        return res.json({ success: true, data: existingLog });
    }

    // Fetch user focus areas
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const userGoals = profile?.focusAreas || [];

    // Call NLP Microservice
    let nlpResponse;
    try {
        const response = await axios.post('http://localhost:8001/analyze', {
            url,
            user_goals: userGoals
        });
        nlpResponse = response.data;
    } catch (nlpError: any) {
        console.error('NLP Service Error:', nlpError.message);
        return res.status(502).json({ success: false, error: 'Failed to communicate with AI analysis service' });
    }

    // Save to Database
    const contentLog = await prisma.contentLog.create({
      data: {
        userId,
        url,
        title: nlpResponse.title,
        thumbnail: nlpResponse.thumbnail || null,
        contentType: nlpResponse.platform,
        isConscious: nlpResponse.recommendation === 'consume',
        score: Math.round(nlpResponse.goal_alignment.score * 100),
        summary: nlpResponse.goal_alignment.reason,
        tags: nlpResponse.content_tags,
        dominantEmotion: nlpResponse.dominant_emotion,
        emotions: nlpResponse.emotions,
        toxicity: nlpResponse.toxicity
      }
    });

    // Update Streak
    await updateStreak(userId);

    res.json({ success: true, data: contentLog });
  } catch (error: any) {
    console.error('Error analyzing content:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/history', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user.id;
        const logs = await prisma.contentLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

export default router;
