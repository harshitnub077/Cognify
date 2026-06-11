"""
/analyze router — Video analysis with semantic caching.

Flow:
  1. Check semantic cache (Qdrant) → if >95% similar video exists, return cached insight
  2. Fetch metadata (title, thumbnail) and transcript in parallel
  3. Run emotion, toxicity, and LLM insight in parallel
  4. Store result in semantic cache + content store
  5. Return structured response
"""
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException
from schemas import AnalyzeRequest, AnalyzeResponse
from services.youtube import fetch_youtube_metadata
from services.emotion import get_emotion
from services.toxicity import get_toxicity
from services.insight import generate_insight_and_score
from services.cache import get_cached_analysis, set_cached_analysis
from services.transcript import get_video_transcript
from services.semantic_cache import semantic_cache_get, semantic_cache_set
from services.content_store import store_content
from services.semantic_chunking import semantic_chunk, retrieve_relevant_chunks, get_chunking_embedder

router = APIRouter(tags=["Analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_url(req: AnalyzeRequest):
    """
    Analyze a YouTube video URL for goal alignment, emotion, and toxicity.
    
    Caching strategy (two layers):
    - Layer 1: Redis exact-match cache (by URL + goals hash) → instant return
    - Layer 2: Qdrant semantic cache (by embedding similarity ≥ 0.95) → saves LLM calls
    """

    # We append a version string to the goals to invalidate older harsh judgments.
    cache_goals = [g + " (v2)" for g in req.user_goals]
    
    cached_data = get_cached_analysis(req.url, cache_goals)
    if cached_data:
        cached_data["cached"] = True
        return cached_data

    # ── Fetch title (needed for semantic cache lookup) ────────────────────────
    if req.title:
        title = req.title
        metadata = {"title": title, "platform": "youtube", "thumbnail": None}
    else:
        metadata = await asyncio.to_thread(fetch_youtube_metadata, req.url)
        title = metadata.get("title", "Unknown Title")

    # ── Layer 2: Semantic cache (Qdrant embedding similarity) ─────────────────
    semantic_hit = await semantic_cache_get(title=title, goals=cache_goals)
    if semantic_hit:
        insight = semantic_hit["insight"]
        # We still need emotion + toxicity for the response schema
        emotion_data, toxicity_data = await asyncio.gather(
            asyncio.to_thread(get_emotion, title),
            asyncio.to_thread(get_toxicity, title),
        )
        response_data = {
            "url": req.url,
            "title": title,
            "platform": metadata.get("platform", "youtube"),
            "thumbnail": metadata.get("thumbnail"),
            "emotions": emotion_data.get("emotions", {}),
            "dominant_emotion": emotion_data.get("dominant_emotion", "neutral"),
            "toxicity": toxicity_data,
            "goal_alignment": {
                "score": insight.get("score", 50),
                "reason": insight.get("text", "Semantically cached insight.")
            },
            "insight": insight,
            "cached": True,
            "analyzed_at": datetime.utcnow().isoformat() + "Z",
        }
        set_cached_analysis(req.url, cache_goals, response_data)
        return response_data

    # ── Fetch transcript in background (non-blocking) ─────────────────────────
    if req.transcript:
        transcript = req.transcript
    else:
        transcript = await asyncio.to_thread(get_video_transcript, req.url)

    # ── Apply Semantic Chunking ───────────────────────────────────────────────
    # If a transcript is found, chunk it semantically and retrieve only the relevant parts
    # for the LLM to process. This prevents hallucination and context drifting.
    focused_transcript = transcript
    embedder = get_chunking_embedder()
    
    if transcript and embedder:
        try:
            chunks = await asyncio.to_thread(semantic_chunk, transcript, 0.4)
            goals_str = ", ".join(req.user_goals) if req.user_goals else "general self-improvement"
            focused_transcript = await asyncio.to_thread(
                retrieve_relevant_chunks, chunks, goals_str, 3
            )
        except Exception as e:
            print(f"[Analyze] Semantic chunking failed, falling back to full transcript: {e}")
            focused_transcript = transcript

    content_text = focused_transcript
    if req.description:
        content_text = f"Description: {req.description}\n\nTranscript: {focused_transcript}" if focused_transcript else f"Description: {req.description}"

    # ── Run all 3 analyses in PARALLEL ────────────────────────────────────────
    emotion_data, toxicity_data, insight_data = await asyncio.gather(
        asyncio.to_thread(get_emotion, title),
        asyncio.to_thread(get_toxicity, title),
        generate_insight_and_score(title, req.user_goals, content_text),
    )

    alignment_score = insight_data.get("score", 50)
    verdict = insight_data.get("verdict", "caution")

    response_data = {
        "url": req.url,
        "title": title,
        "platform": metadata.get("platform", "web"),
        "thumbnail": metadata.get("thumbnail"),
        "emotions": emotion_data.get("emotions", {}),
        "dominant_emotion": emotion_data.get("dominant_emotion", "neutral"),
        "toxicity": toxicity_data,
        "goal_alignment": {
            "score": alignment_score,
            "reason": insight_data.get("text", "Aligned with goals."),
        },
        "insight": insight_data,
        "cached": False,
        "analyzed_at": datetime.utcnow().isoformat() + "Z",
    }

    # ── Save to both cache layers (fire and forget) ───────────────────────────
    set_cached_analysis(req.url, cache_goals, response_data)

    # Semantic cache + content store (run in background, don't block response)
    asyncio.create_task(semantic_cache_set(
        title=title,
        goals=cache_goals,
        insight=insight_data,
    ))

    # Store in content store if user_id is available (extension sends it)
    user_id = getattr(req, "user_id", None)
    if user_id:
        asyncio.create_task(store_content(
            user_id=user_id,
            url=req.url,
            title=title,
            platform=metadata.get("platform", "web"),
            thumbnail=metadata.get("thumbnail"),
            dominant_emotion=emotion_data.get("dominant_emotion", "neutral"),
            toxicity_score=toxicity_data.get("overall", 0.0) if isinstance(toxicity_data, dict) else 0.0,
            alignment_score=float(alignment_score),
            verdict=verdict,
            goals=req.user_goals,
            insight_text=insight_data.get("text", ""),
        ))

    return response_data
