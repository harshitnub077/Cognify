import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

/**
 * Classifies a video based on a dynamically built prompt using OpenAI.
 * @param {string} prompt - The classification prompt to send to OpenAI.
 * @returns {Promise<{verdict: string, confidence: number, reason: string, topicMatch: string}>}
 */
export async function classifyWithAI(prompt) {
  // ── DEMO / NO-API-KEY FALLBACK HEURISTIC ──
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('placeholder')) {
    // Parse the new prompt string format correctly
    const titleMatch = prompt.match(/- Title: (.*?)\n/);
    const interestsMatch = prompt.match(/- Interests:\n([\s\S]*?)(?:- Confirmed|- Blocked|- Goal|- Channel)/);
    
    const title = titleMatch ? titleMatch[1].toLowerCase() : '';
    const interestsText = interestsMatch ? interestsMatch[1].toLowerCase() : '';
    
    // Extract actual topics from the prompt's bullet points
    const topics = interestsText.split('\n')
      .filter(line => line.includes('*'))
      .map(line => line.replace('*', '').trim().split('(')[0].trim());

    // Distraction keywords
    const distractions = ['prank', 'vlog', 'funny', 'fail', 'reaction', 'drama', 'gossip', 'celebrity', 'tiktok', 'shorts', 'gaming', 'playthrough'];
    
    let isDistraction = distractions.some(d => title.includes(d));
    let isEducational = topics.some(t => t.length > 2 && title.includes(t));

    if (isDistraction && !isEducational) {
      return { verdict: 'BLOCK', confidence: 0.95, reason: 'Matched known distraction pattern', topicMatch: 'None' };
    }

    if (isEducational) {
      const matchedTopic = topics.find(t => t.length > 2 && title.includes(t)) || 'Education';
      return { verdict: 'ALLOW', confidence: 0.85, reason: 'Locally matched core interest', topicMatch: matchedTopic };
    }

    // Since this is a hardcoded mock, let's allow content by default if it doesn't match a distraction keyword. 
    // This ensures the user isn't stuck with an entirely blank screen.
    return { verdict: 'ALLOW', confidence: 0.7, reason: 'Allowed by mock AI fallback', topicMatch: 'None' };
  }

  let retries = 1;
  while (retries >= 0) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      // Log token usage for cost monitoring
      const usage = response.usage;
      if (usage) {
        console.log(`[Token Usage] Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
      }

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Validate required fields
      const { verdict, confidence, reason, topicMatch } = parsed;
      if (!verdict || confidence === undefined || !reason || !topicMatch) {
        throw new Error('Missing required fields in OpenAI JSON response');
      }

      return {
        verdict: String(verdict).toUpperCase(),
        confidence: Number(confidence),
        reason: String(reason),
        topicMatch: String(topicMatch),
      };
    } catch (error) {
      // 429 is Too Many Requests
      if (error.status === 429 && retries > 0) {
        console.warn('Rate limit hit. Retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      } else {
        console.error('Error during AI classification:', error);
        throw error;
      }
    }
  }
}
