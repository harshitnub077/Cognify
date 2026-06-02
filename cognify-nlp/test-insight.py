import asyncio
from config import config
from services.insight import generate_insight
from services.gemini_router import call_llm
from services.free_nlp import redis_client

async def main():
    system = "Return JSON: {\"test\":\"ok\"}"
    prompt = "hello"
    res = await call_llm(prompt, system, redis_client, json_mode=True)
    print("RAW LLM OUTPUT:")
    print(res)

asyncio.run(main())
