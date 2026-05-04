import OpenAI from 'openai';

const isGroq = !!(process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('placeholder'));
const apiKey = isGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;

const openai = apiKey && !apiKey.includes('placeholder')
  ? new OpenAI({ 
      apiKey, 
      baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined 
    })
  : null;

const MODEL_NAME = isGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

export async function classifyWithAgent(video, userProfile) {
  if (!openai) {
    // Fallback if no OpenAI key
    return { verdict: 'BLOCK', confidence: 0.5, reason: 'No OpenAI key available for Agent' };
  }

  const systemPrompt = `You are a strict content relevance classifier for a student's YouTube feed.
Your job is to protect their focus time. When in doubt, BLOCK.

User Profile:
- Learning Goals: ${(userProfile.interests || []).map(i => i.topic || i).join(', ')}
- Study Goal: ${userProfile.goal || 'General Focus'}

Rules:
1. ALLOW content that directly advances their Learning Goals.
2. ALLOW high-quality educational, skill-building, or self-improvement content generally (e.g., science, programming, finance, history, health), even if not strictly in their active goals.
3. BLOCK all entertainment, vlogs, gaming, drama, reactions, clickbait, and mindless content.
4. "Study with me" and "Lofi music" are ALLOW.
5. If the content is genuinely useful for learning or personal growth, ALLOW. If it is designed purely for entertainment or dopamine, BLOCK.`;

  const userMessage = `Classify this video:
Title: ${video.title || 'Unknown'}
Channel: ${video.channelName || 'Unknown'}  
Category ID: ${video.category || 'Unknown'} (27=Education, 24=Entertainment, 20=Gaming)
Tags: ${(video.tags || []).slice(0, 10).join(', ')}
Description (first 300 chars): ${(video.description || '').substring(0, 300)}

Think step by step, then respond with JSON:
{"verdict": "ALLOW"|"BLOCK", "confidence": 0.0-1.0, "reason": "one sentence", "topic": "matched interest or None"}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 150,
      temperature: 0.1,
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('[ClassificationAgent] Error:', err);
    return { verdict: 'BLOCK', confidence: 0.5, reason: 'Agent Error' };
  }
}
