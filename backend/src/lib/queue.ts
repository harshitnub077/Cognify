import axios from 'axios';
import prisma from './prisma';

// In-memory queue to replace BullMQ and Redis dependency
class InMemoryQueue {
    async add(name: string, data: any, opts?: any) {
        console.log(`Mock queue: Added job ${name} for url ${data.url}`);
        // Process asynchronously without blocking
        setTimeout(() => this.processJob(data), 100);
        return { id: Math.random().toString(36).substring(7) };
    }

    async processJob(data: any) {
        const { url, userId } = data;
        console.log(`Processing background analysis for ${url}`);
        
        try {
            const profile = await prisma.userProfile.findUnique({ where: { userId } });
            const userGoals = profile?.focusAreas || [];

            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const existingLog = await prisma.contentLog.findFirst({
                where: { userId, url, createdAt: { gte: yesterday } }
            });

            if (existingLog) {
                console.log(`URL ${url} already analyzed recently. Skipping.`);
                return;
            }

            const response = await axios.post('http://localhost:8001/analyze', {
                url,
                user_goals: userGoals
            });
            const nlpResponse = response.data;

            await prisma.contentLog.create({
                data: {
                    userId,
                    url,
                    title: nlpResponse.title,
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
            console.log(`Successfully completed background analysis for ${url}`);

        } catch (error: any) {
            console.error(`Background analysis failed for ${url}:`, error.message);
        }
    }
}

export const analysisQueue = new InMemoryQueue();
