import OpenAI from 'openai';

const isGroq = !!(process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('placeholder'));
const apiKey = isGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;

const openai = apiKey && !apiKey.includes('placeholder')
  ? new OpenAI({ 
      apiKey, 
      baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined 
    })
  : null;

const MODEL_NAME = isGroq ? 'llama-3.2-11b-vision-preview' : 'gpt-4o-mini';

export async function analyzeThumbnail(thumbnailUrl) {
  if (!openai || !thumbnailUrl) {
    return { isClickbait: false, hasExaggeratedFace: false, contentType: 'unknown', confidence: 0 };
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this YouTube thumbnail. Return JSON: {"isClickbait": boolean, "hasExaggeratedFace": boolean, "contentType": "educational|entertainment|gaming|vlog|other", "confidence": 0-1}'
          },
          {
            type: 'image_url',
            image_url: { url: thumbnailUrl, detail: 'low' }
          }
        ]
      }],
      max_tokens: 100,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('[VisionAgent] Error:', err);
    return { isClickbait: false, hasExaggeratedFace: false, contentType: 'unknown', confidence: 0 };
  }
}
