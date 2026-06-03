"""
Drift Coach Agent — Agentic RAG system that analyzes a user's content diet.

This is NOT a simple prompt → response system.
It is a ReAct-style agent that:
  1. RETRIEVES the user's last 20 consumed items from Qdrant
  2. REASONS about patterns: emotion trends, topic clusters, goal gaps
  3. ACTS by constructing a targeted, personalized prompt with real data
  4. GENERATES a structured JSON response with drift score, brutal truth, fix

The "agent" is the code itself orchestrating these steps — the LLM is called
only once with a rich, data-driven context. This is practical agentic RAG.
"""
import json
import asyncio
from collections import Counter
from typing import Optional

from services.content_store import get_recent_content
from services.llm_router import call_llm


# ── Agent Tools (callable by the orchestrator) ────────────────────────────────

def _compute_emotion_profile(items: list[dict]) -> dict:
    """Tool: Aggregates emotion distribution from content history."""
    if not items:
        return {}
    emotion_totals: dict[str, float] = {}
    for item in items:
        dominant = item.get("dominant_emotion", "neutral")
        emotion_totals[dominant] = emotion_totals.get(dominant, 0) + 1

    total = sum(emotion_totals.values())
    return {k: round(v / total, 2) for k, v in sorted(emotion_totals.items(), key=lambda x: -x[1])}


def _compute_topic_clusters(items: list[dict]) -> list[str]:
    """Tool: Extracts the top 5 recurring topics from video titles."""
    if not items:
        return []
    # Simple word frequency on titles (no extra dependencies)
    stop_words = {"the", "a", "an", "how", "to", "in", "on", "of", "for",
                  "and", "with", "your", "my", "is", "are", "do", "you",
                  "this", "that", "what", "why", "best", "top", "vs"}
    word_counts: Counter = Counter()
    for item in items:
        title = item.get("title", "")
        words = [w.lower().strip("?!.,\"'") for w in title.split() if len(w) > 3]
        word_counts.update([w for w in words if w not in stop_words])
    return [word for word, _ in word_counts.most_common(8)]


def _compute_verdict_distribution(items: list[dict]) -> dict:
    """Tool: Computes watch/caution/skip ratios."""
    counts = Counter(item.get("verdict", "caution") for item in items)
    total = max(sum(counts.values()), 1)
    return {v: round(counts.get(v, 0) / total * 100, 1) for v in ["watch", "caution", "skip"]}


def _compute_avg_alignment(items: list[dict]) -> float:
    """Tool: Average goal alignment score across recent content."""
    scores = [item.get("alignment_score", 50) for item in items if item.get("alignment_score") is not None]
    return round(sum(scores) / len(scores), 1) if scores else 50.0


def _find_worst_offenders(items: list[dict], n: int = 3) -> list[str]:
    """Tool: Returns titles of lowest-alignment-score items."""
    sorted_items = sorted(items, key=lambda x: x.get("alignment_score", 100))
    return [item.get("title", "Unknown")[:80] for item in sorted_items[:n]]


def _find_goal_gaps(items: list[dict], goals: list[str]) -> list[str]:
    """Tool: Finds goals that have zero or minimal content coverage."""
    if not goals:
        return []
    all_titles = " ".join(item.get("title", "") for item in items).lower()
    gaps = []
    for goal in goals:
        # Check if any keyword from the goal appears in the watched content
        goal_keywords = [w.lower() for w in goal.split() if len(w) > 4]
        covered = any(kw in all_titles for kw in goal_keywords)
        if not covered:
            gaps.append(goal)
    return gaps


# ── Prompt Builder (constructs the context-rich LLM prompt) ──────────────────

def _build_coach_prompt(
    goals: list[str],
    recent_titles: list[str],
    emotion_profile: dict,
    topic_clusters: list[str],
    verdict_dist: dict,
    avg_alignment: float,
    worst_offenders: list[str],
    goal_gaps: list[str],
) -> str:
    goals_str = "\n".join(f"  - {g}" for g in goals) if goals else "  - No goals set"
    titles_str = "\n".join(f"  - {t}" for t in recent_titles[:20])
    emotions_str = ", ".join(f"{k} ({v*100:.0f}%)" for k, v in emotion_profile.items())
    topics_str = ", ".join(topic_clusters) if topic_clusters else "unclear"
    worst_str = "\n".join(f"  - {t}" for t in worst_offenders)
    gaps_str = "\n".join(f"  - {g}" for g in goal_gaps) if goal_gaps else "  - None (great coverage!)"

    return f"""
You are a brutally honest but deeply caring productivity coach named "The Mirror."
Your job is to analyze a user's recent YouTube/content consumption and tell them the hard truth.

== USER'S STATED LIFE GOALS ==
{goals_str}

== WHAT THEY ACTUALLY WATCHED (last 20 videos) ==
{titles_str}

== DATA ANALYSIS (pre-computed) ==
- Average Goal Alignment Score: {avg_alignment}/100
- Content Verdict Breakdown: {verdict_dist.get('watch', 0)}% Watch-worthy | {verdict_dist.get('caution', 0)}% Caution | {verdict_dist.get('skip', 0)}% Should-have-skipped
- Dominant Emotional Tone: {emotions_str}
- Recurring Topics They're Drawn To: {topics_str}
- Biggest Goal Gaps (goals with NO content watched): 
{gaps_str}
- Worst Offenders (lowest alignment):
{worst_str}

== YOUR TASK ==
Analyze this data like a coach who has seen a hundred people waste their potential.
Be specific — reference actual video titles. Don't be generic.

Return ONLY valid JSON in this exact structure:
{{
  "drift_score": <integer 0-100, where 0=perfectly on track, 100=completely off the rails>,
  "brutal_truth": "<One punchy sentence. Name a specific video title. Make it sting a little.>",
  "pattern": "<One sentence describing the behavioral pattern you see in their watch history.>",
  "algorithm_fix": "<One concrete, specific action to retrain their feed algorithm. Start with a verb.>",
  "bright_spot": "<One genuinely positive observation about their content. Be real, not fake.>",
  "top_goal_gap": "<The single most important goal they're ignoring based on the data.>"
}}
""".strip()


# ── Main Agent Entry Point ────────────────────────────────────────────────────

async def analyze_drift(
    user_id: str,
    goals: list[str],
    redis_client,
    limit: int = 20,
) -> dict:
    """
    Agentic RAG Coach — full pipeline:
    1. Retrieve user's content history from Qdrant
    2. Run all analysis tools in parallel
    3. Build a rich, data-backed prompt
    4. Call LLM via smart router
    5. Return structured JSON response

    This function is the "agent" — the code orchestrates reasoning,
    the LLM only handles language generation.
    """

    # ── Step 1: Retrieve (the R in RAG) ──────────────────────────────────────
    recent_items = await get_recent_content(user_id=user_id, limit=limit)

    if not recent_items:
        return {
            "drift_score": 0,
            "brutal_truth": "No content history yet — start watching and I'll give you the real feedback.",
            "pattern": "No data to analyze yet.",
            "algorithm_fix": "Watch at least 5 videos to get your first drift analysis.",
            "bright_spot": "Clean slate! Your feed hasn't been contaminated yet.",
            "top_goal_gap": goals[0] if goals else "Set some goals first.",
            "items_analyzed": 0,
        }

    # ── Step 2: Run all agent tools in parallel ───────────────────────────────
    (
        emotion_profile,
        topic_clusters,
        verdict_dist,
        avg_alignment,
        worst_offenders,
        goal_gaps,
    ) = await asyncio.gather(
        asyncio.to_thread(_compute_emotion_profile, recent_items),
        asyncio.to_thread(_compute_topic_clusters, recent_items),
        asyncio.to_thread(_compute_verdict_distribution, recent_items),
        asyncio.to_thread(_compute_avg_alignment, recent_items),
        asyncio.to_thread(_find_worst_offenders, recent_items),
        asyncio.to_thread(_find_goal_gaps, recent_items, goals),
    )

    recent_titles = [item.get("title", "Unknown") for item in recent_items]

    # ── Step 3: Build context-rich prompt ─────────────────────────────────────
    prompt = _build_coach_prompt(
        goals=goals,
        recent_titles=recent_titles,
        emotion_profile=emotion_profile,
        topic_clusters=topic_clusters,
        verdict_dist=verdict_dist,
        avg_alignment=avg_alignment,
        worst_offenders=worst_offenders,
        goal_gaps=goal_gaps,
    )

    SYSTEM = (
        "You are 'The Mirror' — a brutally honest AI productivity coach. "
        "You always return valid JSON only. No markdown. No explanation outside the JSON."
    )

    # ── Step 4: Call LLM via smart router ────────────────────────────────────
    try:
        raw_response = await call_llm(
            prompt=prompt,
            system=SYSTEM,
            redis_client=redis_client,
            max_tokens=600,
            json_mode=True,
        )
        result = json.loads(raw_response)
    except json.JSONDecodeError:
        # Extract JSON even if model outputs extra text
        import re
        match = re.search(r'\{.*\}', raw_response or "", re.DOTALL)
        result = json.loads(match.group(0)) if match else {}
    except Exception as e:
        result = {
            "drift_score": int(100 - avg_alignment),
            "brutal_truth": f"LLM unavailable ({e}), but your data says: avg alignment is only {avg_alignment}/100.",
            "pattern": f"Trending toward: {', '.join(topic_clusters[:3])}.",
            "algorithm_fix": "Open YouTube and explicitly search for content related to your goals.",
            "bright_spot": f"{verdict_dist.get('watch', 0)}% of your content was genuinely watch-worthy.",
            "top_goal_gap": goal_gaps[0] if goal_gaps else "No major gaps detected.",
        }

    # ── Step 5: Augment with pre-computed data ────────────────────────────────
    result["items_analyzed"] = len(recent_items)
    result["avg_alignment_score"] = avg_alignment
    result["emotion_profile"] = emotion_profile
    result["verdict_distribution"] = verdict_dist
    result["topic_clusters"] = topic_clusters

    return result
