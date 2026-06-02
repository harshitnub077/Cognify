import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';

const router = Router();

// Only initialize if API key is present
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Mock streaming for local testing without API credits
const streamMockResponse = (res: any) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const responseText = "I notice your alignment score dipped to 68%. What do you think triggered this shift in your consumption habits this week?";
  const words = responseText.split(' ');
  let i = 0;

  const interval = setInterval(() => {
    if (i < words.length) {
      res.write(`data: ${JSON.stringify({ text: words[i] + ' ' })}\n\n`);
      i++;
    } else {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 100);
};

router.post('/message', requireAuth, async (req: any, res: any) => {
  try {
    const { message, conversation_history = [], user_context } = req.body;
    const userId = req.user.id;

    // Get or create active session
    let session = await prisma.coachSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!session || (Date.now() - session.createdAt.getTime()) > 24 * 60 * 60 * 1000) {
      session = await prisma.coachSession.create({
        data: { userId }
      });
    }

    // Save user message
    await prisma.coachMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message
      }
    });

    if (!genAI) {
      // Mock flow
      await prisma.coachMessage.create({
        data: {
          sessionId: session.id,
          role: 'coach',
          content: "I notice your alignment score dipped to 68%. What do you think triggered this shift in your consumption habits this week?"
        }
      });
      return streamMockResponse(res);
    }

    const systemPrompt = `You are the Cognify Coach — a Socratic AI designed to help users develop digital consciousness and align their online habits with their life goals.

CRITICAL RULE: You NEVER give direct advice, instructions, or answers. You ONLY ask questions.
Every single response must end with exactly ONE thoughtful question.
Your questions should be: specific to what the user just said, psychologically probing, non-judgmental, and designed to prompt genuine self-reflection.

User context:
- Identity goals: ${user_context?.goals?.join(', ') || 'None'}
- Current drift score: ${user_context?.drift_score || 0}
- This week's dominant content emotion: ${user_context?.dominant_emotion || 'neutral'}
- Recent content summary: ${user_context?.recent_content_summary || 'No recent content'}

Conversation style: warm, curious, direct but never preachy. Like a wise mentor, not a therapist or a chatbot.
Max response length: 3 sentences + 1 question.`;

    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt 
    });

    const chat = model.startChat({
        history: conversation_history.map((msg: any) => ({
            role: msg.role === 'coach' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }))
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const streamResult = await chat.sendMessageStream(message);

    let fullContent = "";

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      fullContent += text;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    // Save coach response
    await prisma.coachMessage.create({
      data: {
        sessionId: session.id,
        role: 'coach',
        content: fullContent
      }
    });

  } catch (error) {
    console.error('Coach Message Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/daily-prompt', requireAuth, async (req: any, res) => {
  // In a real app, use Redis to cache this per user per day.
  // Using a static mock for demonstration to avoid excessive API calls
  res.json({
    prompt: "You watched 4 videos about productivity but opened no work tool afterward. What do you think is the gap between consuming and doing for you?"
  });
});

router.get('/conversation-history', requireAuth, async (req: any, res) => {
  try {
    const sessions = await prisma.coachSession.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    res.json({ data: sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
