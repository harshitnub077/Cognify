import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import Groq from 'groq-sdk';
import prisma from '../lib/prisma';

const router = Router();

// Only initialize if API key is present
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

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
  let session: any;
  try {
    const { message, conversation_history = [], user_context } = req.body;
    const userId = req.user.id;

    // Get or create active session
    session = await prisma.coachSession.findFirst({
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

    if (!groq) {
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

    const systemPrompt = `You are the Cognify Coach — a strictly focused Socratic AI designed EXCLUSIVELY to help users develop digital consciousness, manage screen time, and align online habits with their life goals.

CRITICAL BOUNDARIES:
1. NEVER answer general knowledge questions, write code, do math, or discuss outer world events.
2. If the user asks about ANYTHING unrelated to their digital habits, screen time, content consumption, or goals, politely refuse and pivot back to their digital alignment. (e.g., "I am here to guide your digital focus, not to answer general questions. Let's return to your goals...")
3. NEVER give direct advice, instructions, or answers. You ONLY ask questions.
4. Every single response must end with exactly ONE thoughtful question.
5. Your questions should be: specific to what the user just said, psychologically probing, non-judgmental, and designed to prompt genuine self-reflection.

User context:
- Identity goals: ${user_context?.goals?.join(', ') || 'None'}
- Current drift score: ${user_context?.drift_score || 0}
- This week's dominant content emotion: ${user_context?.dominant_emotion || 'neutral'}
- Recent content summary: ${user_context?.recent_content_summary || 'No recent content'}

Conversation style: warm, curious, direct but never preachy. Like a wise mentor, not a therapist or a chatbot.
Max response length: 3 sentences + 1 question.`;

    // Map history to OpenAI format
    const groqHistory: any[] = [{ role: 'system', content: systemPrompt }];
    
    for (const msg of conversation_history) {
      if (!msg.content?.trim()) continue; // Skip empty messages
      // Map 'coach' back to 'assistant'
      const role = msg.role === 'coach' ? 'assistant' : 'user';
      groqHistory.push({ role, content: msg.content });
    }
    
    // Add the current message
    groqHistory.push({ role: 'user', content: message });

    const stream = await groq.chat.completions.create({
      messages: groqHistory,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      stream: true,
    });

    // Only write headers AFTER the API call succeeds to prevent crashing on errors
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let fullContent = "";

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        fullContent += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
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

  } catch (error: any) {
    console.error('Coach Message Error:', error.message);
    
    // Automatically fallback to mock response if Gemini API fails (e.g., 429 Quota Exceeded)
    try {
      await prisma.coachMessage.create({
        data: {
          sessionId: session.id,
          role: 'coach',
          content: "I notice your alignment score dipped to 68%. What do you think triggered this shift in your consumption habits this week?"
        }
      });
      return streamMockResponse(res);
    } catch (dbError) {
      console.error('Failed to save mock response:', dbError);
      res.status(500).json({ error: 'Internal server error and AI quota exhausted' });
    }
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
