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
    const { url, title } = req.body;
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

    // Fetch user goals — schema uses identities[] (from Dashboard Goals.tsx)
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const userGoals = (profile as any)?.identities?.length > 0
        ? (profile as any).identities
        : ((profile as any)?.focusAreas?.length > 0 ? (profile as any).focusAreas : ['Focused Developer']);

    // Call NLP Microservice
    let nlpResponse: any;
    try {
        const response = await axios.post('http://localhost:8001/analyze', {
            url,
            title,
            transcript: req.body.transcript,
            description: req.body.description,
            user_goals: userGoals,
            user_id: userId // Pass to NLP so it saves to Qdrant Semantic DB
        }, { timeout: 15000 }); // 15s timeout to prevent hanging
        nlpResponse = response.data;
    } catch (nlpError: any) {
        console.error('NLP Service Error:', nlpError.message);
        return res.status(502).json({ success: false, error: 'Failed to communicate with AI analysis service' });
    }

    // Map verdict → isConscious: "watch" = conscious, "caution"/"skip" = not
    const verdict = nlpResponse.insight?.verdict || 'caution';
    const isConscious = verdict === 'watch';

    // Tags: use dominant emotion + platform as meaningful tags
    const tags = [
        nlpResponse.dominant_emotion,
        nlpResponse.platform,
    ].filter(Boolean);

    let thumbnail = nlpResponse.thumbnail || null;
    if (!thumbnail && url.includes('youtube.com/watch')) {
        try {
            const v = new URL(url).searchParams.get('v');
            if (v) thumbnail = `https://img.youtube.com/vi/${v}/maxresdefault.jpg`;
        } catch (e) {}
    }

    // Save to Database — use platform from NLP (not contentType mismatch)
    const contentLog = await prisma.contentLog.create({
      data: {
        userId,
        url,
        title: nlpResponse.title || 'Untitled',
        thumbnail: thumbnail,
        contentType: nlpResponse.platform || 'web',
        isConscious,
        score: Math.round(nlpResponse.goal_alignment?.score ?? 0),
        summary: nlpResponse.insight?.text || nlpResponse.goal_alignment?.reason || '',
        tags,
        dominantEmotion: nlpResponse.dominant_emotion || 'neutral',
        emotions: nlpResponse.emotions || {},
        toxicity: nlpResponse.toxicity || {}
      }
    });

    res.json({ success: true, data: contentLog });
  } catch (error: any) {
    console.error('Error analyzing content:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/history', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.contentLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            prisma.contentLog.count({ where: { userId } })
        ]);

        // Map contentType → platform for frontend compatibility
        const data = logs.map(log => ({ ...log, platform: log.contentType }));

        res.json({ success: true, data, total, page, limit });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

router.get('/search', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user.id;
        const query = req.query.q as string;
        
        if (!query) {
            return res.json({ success: true, data: [] });
        }

        // Call NLP Semantic Search
        const response = await axios.post('http://localhost:8001/search', {
            user_id: userId,
            query,
            limit: 20
        }, { timeout: 10000 });

        const nlpResults = response.data.data || [];

        // Map NLP response back to the format History.tsx expects (ContentLog schema)
        const mappedData = nlpResults.map((item: any) => ({
            id: item.url, // Fake ID since Qdrant ID is numeric, but URL works for React key
            url: item.url,
            title: item.title,
            thumbnail: item.thumbnail,
            platform: item.platform,
            contentType: item.platform,
            dominantEmotion: item.dominant_emotion,
            score: Math.round(item.alignment_score ?? 0),
            createdAt: item.analyzed_at,
            isConscious: item.verdict === 'watch',
            similarityScore: item.similarity_score
        }));

        res.json({ success: true, data: mappedData });
    } catch (error: any) {
        console.error('Semantic Search Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to perform semantic search' });
    }
});

// DELETE a single content log
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user.id;
        const id = String(req.params.id);
        await prisma.contentLog.deleteMany({ where: { id, userId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete entry' });
    }
});

export default router;
