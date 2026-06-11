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
    
    Evaluate how this aligns with the user goals. 
    
    CRITICAL DIRECTIVES:
    1. TOPICAL ALIGNMENT IS ALL THAT MATTERS: If the video is in the SAME broad topic domain as the user's goals, you MUST give it a VERY HIGH score (85-100) and a "watch" verdict.
    2. NEVER PENALIZE FOR DEPTH: Do NOT penalize content for being introductory, high-level, or an overview, even if the user specifies "Advanced" goals. For example, if the goal is "Advanced Machine Learning" and the video is "Machine Learning explained in 17 min", it is a 95% match. Overviews are relevant to mastery. Never say it "lacks depth."
    3. PENALIZE ONLY DISTRACTIONS: Only give a low score (< 30) and a "skip" verdict if the content is entirely unrelated to the goals (e.g., gaming, drama, unboxing).
    
    Return JSON only:
    {{
        "score": 95,
        "verdict": "watch",
        "text": "1-sentence encouraging explanation of how it aligns with or supports the goals."
    }}
    """
    try:
        response_text = await call_llm(
            prompt=prompt,
            system="You are a highly nuanced, supportive AI that evaluates video alignment to goals. You recognize that foundational overviews are highly relevant to advanced mastery. Return only JSON.",
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
