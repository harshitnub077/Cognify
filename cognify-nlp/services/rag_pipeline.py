import os
import json
import asyncio
import re
from typing import List, Dict, Any

from langchain_qdrant import QdrantVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFacePipeline
from qdrant_client import QdrantClient
from qdrant_client import models
import os
from services.llm_router import call_llm
import redis.asyncio as redis
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

# 1. Initialize Embedder
embedder = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# 2. Connect to Qdrant (Local Path or Docker URL)
qdrant_url = os.getenv("QDRANT_URL")
if qdrant_url:
    client = QdrantClient(url=qdrant_url)
else:
    qdrant_path = os.path.join(os.path.dirname(__file__), "..", "qdrant_db")
    os.makedirs(qdrant_path, exist_ok=True)
    client = QdrantClient(path=qdrant_path)

COLLECTION_NAME = "cognify_content"

try:
    client.get_collection(COLLECTION_NAME)
except Exception:
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config={"size": 384, "distance": "Cosine"}
    )

vectorstore = QdrantVectorStore(
    client=client,
    collection_name=COLLECTION_NAME,
    embedding=embedder
)

# 3. Cross-encoder reranker
reranker_model = HuggingFaceCrossEncoder(
    model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"
)
reranker = CrossEncoderReranker(model=reranker_model, top_n=5)
retriever = ContextualCompressionRetriever(
    base_compressor=reranker,
    base_retriever=vectorstore.as_retriever(
        search_kwargs={
            "k": 20, 
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
)

# Initialize Local LLM via HuggingFacePipeline — LAZY LOADED (avoids 30-60s startup delay)
_llm = None

def get_llm():
    global _llm
    if _llm is None:
        print("Loading TinyLlama (first use only)...")
        _llm = HuggingFacePipeline.from_model_id(
            model_id="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
            task="text-generation",
            pipeline_kwargs={"max_new_tokens": 1024, "do_sample": False}
        )
    return _llm


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
    
    # Phase 1: Retrieve (Parallelized)
    async def process_goal(g: str):
        queries = await rewrite_goal_queries(g)
        tasks = [retriever.ainvoke(q) for q in queries]
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
    
    template = """<|system|>
You are an extremely strict, data-driven AI. You must strictly output JSON arrays of objects. 
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
]</s>
<|user|>
User context: {user_context}
Retrieved content: {context}</s>
<|assistant|>
["""

    prompt = PromptTemplate.from_template(template)
    chain = prompt | get_llm()

    
    try:
        response = await chain.ainvoke({
            "user_context": user_context,
            "context": context,
            "limit": limit
        })
        
        # Clean up TinyLlama output
        json_str = "[" + response.split("<|assistant|>\n[")[-1].strip()
        # Find the last bracket to ensure valid JSON
        if "]" in json_str:
            json_str = json_str[:json_str.rfind("]")+1]
            
        return json.loads(json_str)
    except Exception as e:
        print(f"Failed to parse TinyLlama output: {e}")
        return []
