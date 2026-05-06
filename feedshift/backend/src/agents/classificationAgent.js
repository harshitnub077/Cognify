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
    return { verdict: 'BLOCK', confidence: 0.5, reason: 'No API key available for Agent' };
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

  return _callWithRetry(systemPrompt, userMessage, 150);
}

/**
 * Internal helper: call Groq/OpenAI with automatic retry on 429.
 * Parses the retry-after header and waits before retrying once.
 */
async function _callWithRetry(systemPrompt, userMessage, maxTokens, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        temperature: 0.1,
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      if (err.status === 429 && attempt < retries) {
        // Parse retry-after from Groq headers (default 5s)
        const retryAfter = parseFloat(err.headers?.['retry-after']) || 5;
        console.warn(`[ClassificationAgent] Rate limited. Waiting ${retryAfter}s before retry...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
      console.error('[ClassificationAgent] Error:', err.message || err);
      return { verdict: 'BLOCK', confidence: 0.5, reason: 'Agent Error' };
    }
  }
}

export async function classifyBatchWithAgent(videos, userProfile) {
  if (!openai || !videos || videos.length === 0) {
    const fallback = {};
    for (const v of videos || []) fallback[v.videoId] = { verdict: 'BLOCK', confidence: 0.5, reason: 'No API Key' };
    return fallback;
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

  const videoDescriptions = videos.map((v, i) => `
Video ${i + 1}:
ID: ${v.videoId}
Title: ${v.title || 'Unknown'}
Channel: ${v.channelName || 'Unknown'}
Category ID: ${v.category || 'Unknown'}
Tags: ${(v.tags || []).slice(0, 5).join(', ')}
Description snippet: ${(v.description || '').substring(0, 150)}
`).join('\n---\n');

  const userMessage = `Classify these videos based on the rules.
${videoDescriptions}

Respond EXACTLY with a JSON object where the keys are the Video IDs, and the values are the result object:
{
  "VIDEO_ID_1": {"verdict": "ALLOW"|"BLOCK", "confidence": 0.0-1.0, "reason": "one sentence", "topic": "matched interest or None"},
  "VIDEO_ID_2": {"verdict": "ALLOW"|"BLOCK", "confidence": 0.0-1.0, "reason": "one sentence", "topic": "matched interest or None"}
}`;

  // Use retry logic for rate limit resilience
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        max_tokens: Math.min(150 * videos.length, 4000), // Cap to stay within TPM
        temperature: 0.1,
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (err) {
      if (err.status === 429 && attempt < 1) {
        const retryAfter = parseFloat(err.headers?.['retry-after']) || 5;
        console.warn(`[ClassificationAgent] Batch rate limited. Waiting ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }
      console.error('[ClassificationAgent] Batch Error:', err.message || err);
      const fallback = {};
      for (const v of videos) fallback[v.videoId] = { verdict: 'BLOCK', confidence: 0.5, reason: 'Agent Error' };
      return fallback;
    }
  }
}
