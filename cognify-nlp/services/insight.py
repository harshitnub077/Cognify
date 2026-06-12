import json, os
import redis.asyncio as redis
from services.llm_router import call_llm

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
SYSTEM_PROMPT_INSIGHT = """
You are Cognify's extremely strict, ruthless content analysis engine.
Given content metadata and NLP scores, generate a structured insight.
CRITICAL INSTRUCTION: Be entirely empirical. Do NOT guess, extrapolate, or hallucinate connections. If the data provided does not explicitly and obviously align with the user's goals, you must issue a "skip" or "caution" verdict.
Be brutally concise. No filler words. Return ONLY valid JSON.

Output format:
{
  "verdict": "watch" | "skip" | "caution",
  "insight": "exactly 2 sentences. sentence 1: what this content does to the mind based purely on the data. sentence 2: an extremely harsh assessment of whether it aligns with the user's goals.",
  "identity_impact": "1 short phrase describing personality effect",
  "urgency": "high" | "medium" | "low"
}
"""

USER_PROMPT_INSIGHT = """
Title: {title}
Platform: {platform}
Dominant emotion: {dominant_emotion} ({emotion_score:.0%})
Toxicity: {toxicity_score:.0%}
Goal alignment: {alignment_score:.0%}
User goals: {goals}
Current drift score: {drift_score}

Analyze and return JSON only.
"""

async def generate_insight(content_data: dict, user_data: dict) -> dict:
    prompt = USER_PROMPT_INSIGHT.format(
        title=content_data.get("title", "Unknown"),
        platform=content_data.get("platform", "Unknown"),
        dominant_emotion=content_data.get("dominant_emotion", "neutral"),
        emotion_score=content_data.get("emotion_score", 0.0),
        toxicity_score=content_data.get("toxicity_score", 0.0),
        alignment_score=content_data.get("alignment_score", 0.0),
        goals=", ".join(user_data.get("goals", [])),
        drift_score=user_data.get("drift_score", 0)
    )
    
    try:
        response_text = await call_llm(
            prompt=prompt,
            system=SYSTEM_PROMPT_INSIGHT,
            redis_client=redis_client,
            max_tokens=300,
            json_mode=True
        )
        
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        import ast
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Fallback for when LLMs return single quotes or Python dicts instead of strict JSON
            return ast.literal_eval(text)
    except Exception as e:
        print(f"Error generating insight: {e}")
        return {
            "verdict": "caution",
            "insight": "Failed to generate AI insight.",
            "identity_impact": "Unknown",
            "urgency": "low"
        }

async def generate_insight_and_score(title: str, goals: list[str], transcript: str) -> dict:
    prompt = f"""
    Title: {title}
    User Goals: {goals}
    Transcript summary: {transcript[:1000] if transcript else 'No transcript available.'}
    
    Evaluate how strictly this video aligns with the user's specific goals. 
    
    CRITICAL DIRECTIVES:
    1. BE STRICT AND EMPIRICAL: The video must directly and obviously address the user's goals. Do NOT hallucinate connections, extrapolate, or broadly link unrelated fields (e.g., do not link "no-code app building" to "machine learning" unless the video explicitly teaches machine learning).
    2. PENALIZE MISALIGNMENT: If the video is tangential, generic, or off-topic, assign a low score (< 50) and a "skip" or "caution" verdict. 
    3. NO FALSE ENCOURAGEMENT: Do not invent reasons for why the user should watch it if it doesn't align with their explicit goals. Be honest and ruthless in your assessment.
    
    Return JSON only:
    {{
        "score": <0-100>,
        "verdict": "watch" | "caution" | "skip",
        "text": "1-sentence strict and factual explanation of why it aligns or misaligns with the goals."
    }}
    """
    try:
        response_text = await call_llm(
            prompt=prompt,
            system="You are a strict, empirical AI content evaluator. You ruthlessly judge whether content directly aligns with user goals without hallucinating connections. Return only JSON.",
            redis_client=redis_client,
            max_tokens=300,
            json_mode=True
        )
        text = response_text.strip()
        if text.startswith("```json"): text = text[7:-3].strip()
        elif text.startswith("```"): text = text[3:-3].strip()
        return json.loads(text)
    except Exception as e:
        print(f"Error in generate_insight_and_score: {e}")
        return {
            "score": 50,
            "verdict": "caution",
            "text": "Failed to evaluate due to LLM error."
        }
