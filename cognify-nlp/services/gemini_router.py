import os, time, asyncio
import google.generativeai as genai
from groq import AsyncGroq

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))  # also free

# Track daily usage in Redis
async def get_gemini_usage(redis_client) -> int:
    try:
        val = await redis_client.get("gemini:daily_count")
        return int(val) if val else 0
    except Exception:
        return 0

async def increment_gemini_usage(redis_client):
    try:
        pipe = redis_client.pipeline()
        pipe.incr("gemini:daily_count")
        # Auto-expire at midnight
        import datetime
        now = datetime.datetime.now()
        midnight = datetime.datetime(now.year, now.month, now.day) + datetime.timedelta(days=1)
        ttl = int((midnight - now).total_seconds())
        pipe.expire("gemini:daily_count", ttl)
        await pipe.execute()
    except Exception:
        pass

async def call_llm(prompt: str, system: str, redis_client,
                   max_tokens: int = 500, json_mode: bool = True) -> str:
    """Smart router: Gemini → Groq → local fallback"""
    
    usage = await get_gemini_usage(redis_client)
    
    # Reserve last 100 calls for coach feature (most important)
    if usage < 900:
        try:
            model = genai.GenerativeModel(
                "gemini-2.5-flash",
                system_instruction=system
            )
            config = genai.GenerationConfig(
                max_output_tokens=max_tokens,
                response_mime_type="application/json" if json_mode else "text/plain"
            )
            import asyncio
            response = await asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config=config
            )
            await increment_gemini_usage(redis_client)
            return response.text
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                pass  # Fall through to Groq
            else:
                raise
    
    # Fallback to Groq (also free, 1000 RPD)
    messages = [{"role":"system","content":system},{"role":"user","content":prompt}]
    resp = await groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=max_tokens
    )
    return resp.choices[0].message.content
