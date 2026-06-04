"""
/coach router — Agentic RAG endpoints:
  POST /coach/analyze-drift   → The Drift Coach Agent
  GET  /coach/search          → Semantic search over personal history
  GET  /coach/status          → LLM router health & quota
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services.drift_coach import analyze_drift
from services.content_store import semantic_search_content
from services.llm_router import get_router_status

import os
import redis.asyncio as redis
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

router = APIRouter(prefix="/coach", tags=["Coach"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DriftRequest(BaseModel):
    user_id: str
    goals: list[str] = []
    limit: int = 20  # how many recent items to analyze


class DriftResponse(BaseModel):
    drift_score: int
    brutal_truth: str
    pattern: str
    algorithm_fix: str
    bright_spot: str
    top_goal_gap: str
    items_analyzed: int
    avg_alignment_score: float
    emotion_profile: dict
    verdict_distribution: dict
    topic_clusters: list[str]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/analyze-drift", response_model=DriftResponse)
async def coach_analyze_drift(req: DriftRequest):
    """
    The Agentic Drift Coach.
    
    Retrieves user's content history from Qdrant, runs 6 analytical tools
    in parallel, then calls the LLM with a rich data-backed context to produce
    a structured, personalized drift analysis report.

    Example response:
    {
      "drift_score": 72,
      "brutal_truth": "You watched 'How to get rich quick with crypto' twice this week — 
                        that's not research, that's avoidance.",
      "pattern": "You're drawn to aspirational content but avoiding the hard technical work 
                  your goals actually require.",
      "algorithm_fix": "Watch one 30-minute tutorial on your weakest skill today and 
                         immediately mark it as helpful.",
      ...
    }
    """
    if not req.user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    try:
        result = await analyze_drift(
            user_id=req.user_id,
            goals=req.goals,
            redis_client=redis_client,
            limit=req.limit,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coach agent failed: {str(e)}")


@router.get("/search")
async def semantic_search(
    user_id: str = Query(..., description="User ID"),
    q: str = Query(..., description="Natural language query, e.g. 'videos about Python'"),
    limit: int = Query(default=10, le=50),
):
    """
    Semantic search over the user's personal content history.
    
    Examples:
    - "videos that made me feel motivated"
    - "everything I watched about machine learning"
    - "content related to my fitness goal"
    
    Uses embedding similarity — works even if you don't remember the exact title.
    """
    if not user_id or not q:
        raise HTTPException(status_code=400, detail="user_id and q are required")

    try:
        results = await semantic_search_content(user_id=user_id, query=q, limit=limit)
        return {"query": q, "results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/status")
async def llm_status():
    """
    Returns the current health and quota status of all LLM providers.
    Useful for debugging which provider is active.
    """
    try:
        status = await get_router_status(redis_client)
        return status
    except Exception as e:
        return {"error": str(e), "message": "Could not retrieve LLM router status"}
