"""
Content Store — Qdrant collection for persisting all analyzed videos.

This is the RAG knowledge base. Every video the user watches gets embedded
and stored here. The Coach agent queries this collection to understand
the user's content diet over time.

Collection: "cognify_content_v2"
Schema:
  - vector: 384-dim MiniLM embedding of title + transcript snippet
  - payload:
      user_id: str
      url: str
      title: str
      platform: str
      thumbnail: str | null
      dominant_emotion: str
      toxicity_score: float
      alignment_score: float
      verdict: str  (watch | caution | skip)
      goals: list[str]
      analyzed_at: str (ISO)
"""
import asyncio
import uuid
from datetime import datetime
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct,
    Filter, FieldCondition, MatchValue, ScoredPoint
)
from langchain_huggingface import HuggingFaceEmbeddings

CONTENT_COLLECTION = "cognify_content_v2"
VECTOR_SIZE = 384

_embedder: Optional[HuggingFaceEmbeddings] = None
_client: Optional[QdrantClient] = None


def init_content_store(embedder: HuggingFaceEmbeddings, qdrant_client: QdrantClient):
    """Initialize with shared instances. Called once at startup."""
    global _embedder, _client
    _embedder = embedder
    _client = qdrant_client

    collections = [c.name for c in qdrant_client.get_collections().collections]
    if CONTENT_COLLECTION not in collections:
        qdrant_client.create_collection(
            collection_name=CONTENT_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"[ContentStore] Created collection '{CONTENT_COLLECTION}'")


async def store_content(
    user_id: str,
    url: str,
    title: str,
    platform: str,
    thumbnail: Optional[str],
    dominant_emotion: str,
    toxicity_score: float,
    alignment_score: float,
    verdict: str,
    goals: list[str],
    insight_text: str = "",
) -> str:
    """
    Embed and store a watched video in the content collection.
    Returns the point ID.
    """
    if _embedder is None or _client is None:
        raise RuntimeError("ContentStore not initialized")

    # Embed title + summary for rich semantic search
    text_to_embed = f"{title}. {insight_text[:300]}" if insight_text else title
    vector = await asyncio.to_thread(_embedder.embed_query, text_to_embed)

    point_id = str(uuid.uuid4())
    numeric_id = int(uuid.UUID(point_id)) % (2**63)

    _client.upsert(
        collection_name=CONTENT_COLLECTION,
        points=[
            PointStruct(
                id=numeric_id,
                vector=vector,
                payload={
                    "user_id": user_id,
                    "url": url,
                    "title": title,
                    "platform": platform,
                    "thumbnail": thumbnail,
                    "dominant_emotion": dominant_emotion,
                    "toxicity_score": toxicity_score,
                    "alignment_score": alignment_score,
                    "verdict": verdict,
                    "goals": goals,
                    "analyzed_at": datetime.utcnow().isoformat(),
                },
            )
        ],
    )
    return point_id


async def get_recent_content(user_id: str, limit: int = 20) -> list[dict]:
    """
    Retrieve the N most recent content items for a user.
    Used by the Coach agent to understand the user's content diet.
    """
    if _client is None:
        return []

    # scroll() returns (points, next_page_offset) — unpack safely
    scroll_result = _client.scroll(
        collection_name=CONTENT_COLLECTION,
        scroll_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=limit,
        with_payload=True,
        with_vectors=False,
    )
    points = scroll_result[0] if isinstance(scroll_result, tuple) else scroll_result

    # Sort by analyzed_at descending (most recent first)
    items = [r.payload for r in points if r.payload]
    items.sort(key=lambda x: x.get("analyzed_at", ""), reverse=True)
    return items[:limit]


async def semantic_search_content(user_id: str, query: str, limit: int = 10) -> list[dict]:
    """
    Natural language search over a user's personal content history.
    Example: "videos that made me feel motivated about learning"
    """
    if _embedder is None or _client is None:
        return []

    vector = await asyncio.to_thread(_embedder.embed_query, query)

    # qdrant-client ≥ 1.10: use query_points() instead of search()
    response = _client.query_points(
        collection_name=CONTENT_COLLECTION,
        query=vector,
        query_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=limit,
        with_payload=True,
    )

    return [
        {**r.payload, "similarity_score": round(r.score, 3)}
        for r in response.points
        if r.payload
    ]
