import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Simple in-memory cache to prevent Gemini API exhaustion
const aiCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

router.get('/emotion-timeline', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user.id;
        
        // Date 365 days ago for full heatmap history
        const yearAgo = new Date();
        yearAgo.setDate(yearAgo.getDate() - 365);

        const logs = await prisma.contentLog.findMany({
            where: {
                userId,
                createdAt: { gte: yearAgo.toISOString() }
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
        
        // Live Dynamic Drift Score Calculation
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 14);

        const currentWeekLogs = await prisma.contentLog.findMany({
            where: { userId, createdAt: { gte: sevenDaysAgo } },
            select: { score: true }
        });

        const prevWeekLogs = await prisma.contentLog.findMany({
            where: { userId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
            select: { score: true }
        });

        const currentAvg = currentWeekLogs.length > 0 
            ? currentWeekLogs.reduce((acc, l) => acc + l.score, 0) / currentWeekLogs.length 
            : 0;
            
        const prevAvg = prevWeekLogs.length > 0 
            ? prevWeekLogs.reduce((acc, l) => acc + l.score, 0) / prevWeekLogs.length 
            : 0;

        let calculatedScore = currentAvg - prevAvg;
        let trend = 'stable';
        if (calculatedScore > 5) trend = 'improving';
        else if (calculatedScore < -5) trend = 'drifting';
        
        // If there's no data at all, return 0 stable
        if (currentWeekLogs.length === 0 && prevWeekLogs.length === 0) {
            calculatedScore = 0;
            trend = 'stable';
        }

        return res.json({ 
            success: true, 
            score: Math.round(calculatedScore), 
            trend, 
            data: { score: calculatedScore, trend } 
        });
    } catch (error) {
        console.error('Error calculating drift score:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate drift score' });
    }
});

const BLINDSPOT_PROMPT = `Analyze this list of content topics a user consumed in the last 30 days.
Detect if there is an ideological echo chamber or blind spot.

Return ONLY valid JSON:
{
  "detected": true | false,
  "dominant_theme": "the theme that dominates (or null)",
  "percentage": 0-100,
  "alert_message": "1 sentence plain-language alert for the user (or null if not detected)",
  "suggestion": "1 specific type of content they should explore for balance (or null)"
}

Content topics (last 30 days):
{topics}`;

router.post('/blind-spot', requireAuth, async (req: any, res: any) => {
  try {
    if (!genAI) {
      return res.status(503).json({ error: "Gemini API key is not configured" });
    }

    const userId = req.user.id;
    
    // Check Cache
    const cacheKey = `blindspot_${userId}`;
    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.contentLog.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { tags: true }
    });

    const topics = logs.flatMap(log => log.tags).filter(Boolean);
    
    if (topics.length === 0) {
      return res.json({ detected: false });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    const prompt = BLINDSPOT_PROMPT.replace('{topics}', topics.map(t => `- ${t}`).join('\\n'));
    
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    if (text.startsWith('\`\`\`json')) {
        text = text.slice(7, -3).trim();
    } else if (text.startsWith('\`\`\`')) {
        text = text.slice(3, -3).trim();
    }

    const analysis = JSON.parse(text);
    
    // Save to Cache
    aiCache.set(cacheKey, { data: analysis, timestamp: Date.now() });
    
    return res.json(analysis);
  } catch (error) {
    console.error('Error analyzing blind spots:', error);
    res.status(500).json({ error: 'Failed to analyze blind spots' });
  }
});

const WEEKLY_REPORT_PROMPT = `You are generating a Cognify weekly mind report.
The user consumed the following content this week (title + scores).
Analyze the FULL list and generate a personalized report.

Return ONLY valid JSON in this exact format:
{
  "headline": "5-word punchy summary of their week",
  "drift_story": [
    "sentence about what happened this week with their content",
    "sentence about what it means for their identity goals",
    "sentence about what shifted vs last week"
  ],
  "top_insight": "the single most important thing they should know",
  "pattern_detected": "name of behavioral pattern detected (e.g. planning loop, rage spiral, focus streak)",
  "pattern_explanation": "1 sentence explaining the pattern in plain language",
  "next_week_focus": "1 specific, actionable focus for next week (not generic advice)",
  "positive_moment": "highlight the single best content choice they made this week"
}

Content this week:
{content_list}

User goals: {goals}
Current drift score: {drift_score}
Previous week drift: {prev_drift}`;

router.get('/weekly-report', requireAuth, async (req: AuthRequest, res: any) => {
    try {
        if (!genAI) {
            return res.status(503).json({ success: false, error: "Gemini API key is not configured" });
        }
        
        const userId = req.user.id;

        // Check Cache
        const cacheKey = `weeklyreport_${userId}`;
        const cached = aiCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json({ success: true, data: cached.data });
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const logs = await prisma.contentLog.findMany({
            where: { userId, createdAt: { gte: sevenDaysAgo } },
            orderBy: { createdAt: 'desc' }
        });

        const profile = await prisma.userProfile.findUnique({ where: { userId } });
        const goals = (profile as any)?.identities?.join(', ') || (profile as any)?.focusAreas?.join(', ') || 'None specified';

        const driftScores = await prisma.driftScore.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            take: 2
        });
        
        const currentDrift = driftScores[0]?.score || 0;
        const prevDrift = driftScores[1]?.score || 0;

        const contentList = logs.map(log => 
            `- ${log.title || 'Unknown Title'} | type: ${log.contentType} | alignment: ${log.score}% | emotion: ${log.dominantEmotion || 'neutral'}`
        ).join('\\n');

        const prompt = WEEKLY_REPORT_PROMPT
            .replace('{content_list}', contentList)
            .replace('{goals}', goals)
            .replace('{drift_score}', currentDrift.toString())
            .replace('{prev_drift}', prevDrift.toString());

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        
        if (text.startsWith('\`\`\`json')) {
            text = text.slice(7, -3).trim();
        } else if (text.startsWith('\`\`\`')) {
            text = text.slice(3, -3).trim();
        }

        const report = JSON.parse(text);

        // Save to Cache
        aiCache.set(cacheKey, { data: report, timestamp: Date.now() });

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Error generating weekly report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate weekly report' });
    }
});

export default router;
