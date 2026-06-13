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

    // Fetch user goals — schema uses identities[] (from Dashboard Goals.tsx)
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const userGoals = (profile as any)?.identities?.length > 0
        ? (profile as any).identities
        : ((profile as any)?.focusAreas?.length > 0 ? (profile as any).focusAreas : ['Focused Developer']);

    // Cache Check: To prevent spamming the NLP service for the exact same URL repeatedly by the extension
    // Reduced to 5 seconds so changing goals updates insight immediately.
    const validCacheTime = new Date(Date.now() - 5 * 1000);

    const existingLog = await prisma.contentLog.findFirst({
        where: {
            userId,
            url,
            createdAt: { gte: validCacheTime }
        }
    });

    if (existingLog) {
        return res.json({ success: true, data: existingLog });
    }

    // Call NLP Microservice
    let nlpResponse: any;
    try {
        const nlpApiUrl = process.env.NLP_API_URL || 'http://localhost:8001';
        const response = await axios.post(`${nlpApiUrl}/analyze`, {
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
        console.log('Falling back to Gemini for content analysis based on active goal');
        
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
            
            if (!genAI) throw new Error("No Gemini API key available");
            
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a strict, hyper-intelligent content curation AI for productivity. 
            Analyze this YouTube video to determine if it strictly aligns with the user's active goals.
            
            User Active Goals: ${JSON.stringify(userGoals)}
            Video Title: ${title}
            Video Description: ${req.body.description || ''}
            Partial Transcript: ${req.body.transcript ? req.body.transcript.substring(0, 1500) : ''}
            
            If it perfectly aligns and is highly productive for these goals, verdict is "watch". 
            If it's somewhat related but maybe a distraction, verdict is "caution". 
            If it's unrelated brain-rot or distraction, verdict is "skip".
            
            Return ONLY a valid JSON object matching this schema (do not include markdown \`\`\`json wrappers):
            {
              "insight": {
                "verdict": "watch" | "caution" | "skip",
                "text": "1-2 punchy sentences explaining exactly why this is good or bad for their specific goal."
              },
              "goal_alignment": {
                "score": number, // 0-100. 85+ if highly relevant, <40 if distraction
                "reason": "Short reason"
              },
              "dominant_emotion": "inspired" | "neutral" | "joy" | "boredom" | "anxiety",
              "platform": "youtube"
            }`;
            
            const result = await model.generateContent(prompt);
            let text = result.response.text().trim();
            if (text.startsWith('\`\`\`json')) text = text.substring(7, text.length - 3).trim();
            else if (text.startsWith('\`\`\`')) text = text.substring(3, text.length - 3).trim();
            
            nlpResponse = JSON.parse(text);
        } catch (geminiError) {
            console.error('Gemini fallback failed:', geminiError);
            return res.status(502).json({ success: false, error: 'Failed to communicate with AI analysis service' });
        }
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
        const nlpApiUrl = process.env.NLP_API_URL || 'http://localhost:8001';
        const response = await axios.post(`${nlpApiUrl}/search`, {
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

// UPDATE actual watch time for a content log
router.put('/time', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user.id;
        const { url, additionalSecs } = req.body;

        if (!url || !additionalSecs || additionalSecs <= 0) {
            return res.status(400).json({ success: false, error: 'Valid URL and additionalSecs required' });
        }

        // Find the most recent log for this URL to update
        // Use video ID matching for YouTube to handle URL params like &t=
        let matchCondition: any = { equals: url };
        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?\s]+)/);
        if (ytMatch && ytMatch[1]) {
            matchCondition = { contains: ytMatch[1] };
        }

        const recentLog = await prisma.contentLog.findFirst({
            where: { userId, url: matchCondition },
            orderBy: { createdAt: 'desc' }
        });

        if (!recentLog) {
            return res.status(404).json({ success: false, error: 'Content log not found' });
        }

        const updatedLog = await prisma.contentLog.update({
            where: { id: recentLog.id },
            data: { timeSpentSecs: recentLog.timeSpentSecs + additionalSecs }
        });

        res.json({ success: true, data: { timeSpentSecs: updatedLog.timeSpentSecs } });
    } catch (error) {
        console.error('Error updating time spent:', error);
        res.status(500).json({ success: false, error: 'Failed to update time spent' });
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
