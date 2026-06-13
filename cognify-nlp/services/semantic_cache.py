"""
Semantic Cache — Qdrant-backed, embedding-similarity cache.

Unlike a key-value cache (Redis), this cache is SEMANTIC:
- Two videos with different titles but near-identical meaning return the same insight.
- Similarity threshold: 0.95 (configurable)
- This cuts LLM API calls dramatically for similar content.

Collection: "cognify_semantic_cache"
Schema:
  - vector: 384-dim MiniLM embedding of the video's fingerprint text
  - payload: {"insight": {...}, "title": str, "created_at": str}
"""
import json
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct, Filter,
    FieldCondition, Range, MatchValue
)

# Shared embedder instance (imported from wherever it's initialized)
_embedder = None
_qdrant_client: Optional[QdrantClient] = None

CACHE_COLLECTION = "cognify_semantic_cache_v2"
SIMILARITY_THRESHOLD = 0.88  # ≥88% cosine similarity = cache hit (tuned from real data)
VECTOR_SIZE = 3072             # Gemini embedding-001 output dimension

CACHE_TTL_DAYS = 7


def init_semantic_cache(embedder, qdrant_client: QdrantClient):
    """Call once at startup with the shared embedder and Qdrant client."""
    global _embedder, _qdrant_client
    _embedder = embedder
    _qdrant_client = qdrant_client

    collections = [c.name for c in qdrant_client.get_collections().collections]
    if CACHE_COLLECTION not in collections:
        qdrant_client.create_collection(
            collection_name=CACHE_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"[SemanticCache] Created collection '{CACHE_COLLECTION}'")


def _make_fingerprint(title: str, goals: list[str]) -> str:
    """
    Fingerprint = title + sorted goals.
    We embed this text to find semantically similar queries.
    """
    goals_str = " | ".join(sorted(goals)) if goals else "general"
    return f"{title.strip()} [goals: {goals_str}]"


def _make_point_id(title: str, goals: list[str]) -> str:
    """Deterministic UUID-style ID from fingerprint."""
    fp = _make_fingerprint(title, goals)
    return hashlib.md5(fp.encode()).hexdigest()


async def semantic_cache_get(title: str, goals: list[str]) -> Optional[dict]:
    """
    Search the semantic cache.
    Returns cached insight dict if similarity ≥ 0.95, else None.
    """
    if _embedder is None or _qdrant_client is None:
        return None

    fingerprint = _make_fingerprint(title, goals)

    # Run embedding in thread to keep async clean
    vector = await asyncio.to_thread(_embedder.embed_query, fingerprint)

    try:
        # qdrant-client ≥ 1.10 uses query_points() instead of search()
        response = _qdrant_client.query_points(
            collection_name=CACHE_COLLECTION,
            query=vector,
            limit=1,
            score_threshold=SIMILARITY_THRESHOLD,
            with_payload=True,
        )
        results = response.points
    except Exception as e:
        print(f"[SemanticCache] Search error: {e}")
        return None

    if not results:
        return None

    hit = results[0]
    payload = hit.payload or {}
    insight = payload.get("insight")

    if not insight:
        return None

    print(f"[SemanticCache] ✅ HIT (score={hit.score:.3f}) for: '{title[:60]}'")
    return {"insight": insight, "cache_score": hit.score, "cached_title": payload.get("title")}


async def semantic_cache_set(title: str, goals: list[str], insight: dict):
    """Store a new analysis result in the semantic cache."""
    if _embedder is None or _qdrant_client is None:
        return

    fingerprint = _make_fingerprint(title, goals)
    vector = await asyncio.to_thread(_embedder.embed_query, fingerprint)
    point_id = _make_point_id(title, goals)

    # Convert hex string to integer for Qdrant point ID
    numeric_id = int(point_id, 16) % (2**63)

    try:
        _qdrant_client.upsert(
            collection_name=CACHE_COLLECTION,
            points=[
                PointStruct(
                    id=numeric_id,
                    vector=vector,
                    payload={
                        "title": title,
                        "goals": goals,
                        "insight": insight,
                        "created_at": datetime.utcnow().isoformat(),
                        "expires_at": (datetime.utcnow() + timedelta(days=CACHE_TTL_DAYS)).isoformat(),
                    },
                )
            ],
        )
        print(f"[SemanticCache] 💾 Stored: '{title[:60]}'")
    except Exception as e:
        print(f"[SemanticCache] Store error: {e}")
