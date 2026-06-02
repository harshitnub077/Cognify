import json, os
from services.gemini_router import call_llm
from services.free_nlp import redis_client

SYSTEM_PROMPT_INSIGHT = """
You are Cognify's content analysis engine.
Given content metadata and NLP scores, generate a structured insight.
Be brutally concise. No filler words. Return ONLY valid JSON.

Output format:
{
  "verdict": "watch" | "skip" | "caution",
  "insight": "exactly 2 sentences. sentence 1: what this content does to the mind. sentence 2: whether it aligns with the user's goals.",
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
