"""
gemini.py — Legacy shim. Now delegates to the smart LLM router.

Kept for backward compatibility with any code that imports
`generate_insight_and_score` directly.

The actual LLM priority is: Ollama (local) → Groq → Gemini Flash
"""
import json
import re
import asyncio
from services.llm_router import call_llm

# ── Try to get the shared redis client; gracefully degrade if unavailable ────
try:
    from services.free_nlp import redis_client as _redis_client
except ImportError:
    _redis_client = None


def extract_json(text: str) -> dict:
    """Extract first JSON object from a string, handling markdown fences."""
    if not text:
        return {}
    # Strip markdown code fences
    text = re.sub(r"```json?\s*", "", text).strip().rstrip("`")
    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON from LLM response: {e}\nRaw: {text[:200]}")


def generate_insight_and_score(title: str, goals: list[str], transcript: str = None) -> dict:
    """
    Synchronous wrapper — calls the async LLM router via asyncio.run().
    Used by the analyze router (which wraps this in asyncio.to_thread).

    Priority: Ollama (local) → Groq → Gemini Flash
    """
    prompt = _build_insight_prompt(title, goals, transcript)
    system = (
        "You are an elite productivity and goal-alignment AI. "
        "You always respond with valid JSON only. No markdown. No explanation outside the JSON."
    )

    async def _run():
        return await call_llm(
            prompt=prompt,
            system=system,
            redis_client=_redis_client,
            max_tokens=400,
            json_mode=True,
        )

    try:
        raw = asyncio.run(_run())
        return extract_json(raw)
    except RuntimeError:
        # asyncio.run() fails if there's already a running event loop
        # This happens when called from within an async context via to_thread
        loop = asyncio.new_event_loop()
        try:
            raw = loop.run_until_complete(_run())
            return extract_json(raw)
        finally:
            loop.close()
    except Exception as e:
        print(f"[gemini.py] All LLM providers failed: {e}")
        return {
            "score": 0,
            "verdict": "caution",
            "text": "All AI providers are currently unavailable. Please try again shortly.",
            "identity_impact": "Could not evaluate due to temporary service unavailability.",
        }


def _build_insight_prompt(title: str, goals: list[str], transcript: str = None) -> str:
    goals_str = ", ".join(goals) if goals else "general self-improvement"

    if transcript:
        content_section = f"""
VIDEO TRANSCRIPT (analyze substance, not just title):
{transcript[:2000]}
"""
    else:
        content_section = "(No transcript — evaluate based on title only. Do not hallucinate content.)"

    return f"""
You are an elite productivity and goal-alignment AI. Analyze this YouTube video for a user who wants to avoid doomscrolling.

USER'S GOALS: "{goals_str}"
VIDEO TITLE: "{title}"
{content_section}

SCORING GUIDE:
- 90-100: Essential. Directly actionable and goal-aligned.
- 70-89: Useful. Relevant but broad or tangential.
- 40-69: Caution. Mostly entertainment or loosely related.
- 0-39: Skip. Distraction, clickbait, or unrelated.

VERDICT RULES:
- "watch" → score ≥ 70
- "caution" → score 40-69
- "skip" → score < 40

Respond ONLY with this exact JSON structure:
{{
  "score": <integer 0-100>,
  "verdict": "<watch|caution|skip>",
  "text": "<1-2 sentences. Be specific. Reference the video title.>",
  "identity_impact": "<1 sentence on how watching this affects their focus identity.>"
}}
""".strip()
