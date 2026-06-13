import os
import json
import asyncio
import re
from typing import List, Dict, Any

from langchain_qdrant import QdrantVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client import models
from services.llm_router import call_llm
import redis.asyncio as redis

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

# Lazy load the retriever components to save RAM on Render (512MB limit)
_retriever = None

def get_retriever():
    global _retriever
    if _retriever is not None:
        return _retriever

    embedder = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY", "")
    )

    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    if qdrant_url:
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
    else:
        qdrant_path = os.path.join(os.path.dirname(__file__), "..", "qdrant_db")
        os.makedirs(qdrant_path, exist_ok=True)
        client = QdrantClient(path=qdrant_path)

    COLLECTION_NAME = "cognify_content_v3"

    try:
        client.get_collection(COLLECTION_NAME)
    except Exception:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={"size": 3072, "distance": "Cosine"}
        )

    vectorstore = QdrantVectorStore(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding=embedder
    )

    _retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": 5, 
            "filter": models.Filter(
                must=[
                    models.FieldCondition(
                        key="metadata.toxicity_score",
                        range=models.Range(lt=0.3)
                    )
                ]
            )
        }
    )
    return _retriever

QUERY_REWRITE_PROMPT = """
Given a user's identity goal, generate 4 specific YouTube search queries
that would find the most useful, non-toxic, educational content.

Rules:
- Queries must be specific (not "motivation" but "deep work techniques for programmers")
- Avoid clickbait-style queries
- Vary the angle: tutorial, theory, story, practical
- Return ONLY a JSON array of 4 strings. No explanation.

Goal: {goal}
"""

async def rewrite_goal_queries(goal: str) -> List[str]:
    try:
        response_text = await call_llm(
            prompt=QUERY_REWRITE_PROMPT.format(goal=goal),
            system="You are an expert at writing YouTube search queries.",
            redis_client=redis_client,
            max_tokens=300,
            json_mode=True
        )
        
        text = response_text.strip()
        text = text.replace("```json","").replace("```","").strip()
        return json.loads(text)
    except Exception as e:
        print(f"Fallback rewrite due to parsing error: {e}")
        return [goal]

async def rag_recommend(user_goals: List[str], emotional_state: Dict[str, Any], drift_score: float, limit: int = 5) -> List[Dict[str, Any]]:
    all_docs = []
    retriever_instance = get_retriever()
    
    # Phase 1: Retrieve (Parallelized)
    async def process_goal(g: str):
        queries = await rewrite_goal_queries(g)
        tasks = [retriever_instance.ainvoke(q) for q in queries]
        results = await asyncio.gather(*tasks)
        return [doc for docs in results for doc in docs]

    goal_results = await asyncio.gather(*[process_goal(g) for g in user_goals])
    for docs in goal_results:
        all_docs.extend(docs)

    # Phase 2: Deduplicate
    seen = set()
    unique_docs = []
    for doc in all_docs:
        vid = doc.metadata.get("video_id", hash(doc.page_content))
        if vid not in seen:
            seen.add(vid)
            unique_docs.append(doc)

    if not unique_docs:
        return []

    # Phase 3: Generate
    context = "\n\n".join([d.page_content for d in unique_docs[:5]])
    user_context = f"Goals: {user_goals}, Emotion: {emotional_state}, Drift: {drift_score}"
    
    system_prompt = """You are an extremely strict, data-driven AI. You must strictly output JSON arrays of objects. 
CRITICAL INSTRUCTION: You may ONLY recommend videos that explicitly exist in the "Retrieved content". Do NOT invent or hallucinate video IDs, titles, or concepts. If the retrieved content cannot help achieve the user goals, return an empty JSON array []. 
Do not write markdown. Do not write text outside the JSON. Return exactly {limit} recommendations based on the context.
Format exactly like this:
[
  {{
    "video_id": "video123",
    "title": "Title",
    "reason": "This helps because...",
    "alignment_score": 0.9
  }}
]"""

    prompt = f"User context: {user_context}\nRetrieved content: {context}"
    
    try:
        response_text = await call_llm(
            prompt=prompt,
            system=system_prompt.replace("{limit}", str(limit)),
            redis_client=redis_client,
            max_tokens=1000,
            json_mode=True
        )
        
        json_str = response_text.strip().replace("```json","").replace("```","").strip()
        
        # Fallback to extract array if llm included text
        if "[" in json_str and "]" in json_str:
            json_str = json_str[json_str.find("["):json_str.rfind("]")+1]
            
        return json.loads(json_str)
    except Exception as e:
        print(f"Failed to parse cloud LLM output: {e}")
        return []
