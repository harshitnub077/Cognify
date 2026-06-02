from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import asyncio
import hashlib

from config import config
from schemas import AnalyzeRequest, BatchAnalyzeRequest, AnalyzeResponse, DriftRequest, DriftResponse
from models.loader import model_loader
from cache.redis_client import redis_cache

from services.youtube import fetch_youtube_metadata
from services.scraper import scrape_metadata
from services.free_nlp import analyze_emotion, analyze_toxicity, compute_alignment
from services.insight import generate_insight

app = FastAPI(title="Cognify NLP API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"], # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Pre-warm models and connect to cache
    model_loader.load_models()
    redis_cache.connect()

@app.get("/health")
async def health_check():
    return {"status": "ok", "models_loaded": model_loader.is_loaded}

async def process_url(url: str, user_goals: list[str]) -> dict:
    cache_key = redis_cache.generate_key("analyze", url)
    cached_result = redis_cache.get(cache_key)
    
    if cached_result:
        return cached_result

    # 1. Fetch Metadata
    metadata = None
    if "youtube.com" in url or "youtu.be" in url:
        metadata = fetch_youtube_metadata(url)
    
    if not metadata:
        metadata = scrape_metadata(url)
        
    if not metadata:
        metadata = {
            "title": "Unknown Content",
            "description": "",
            "channel": "Unknown",
            "tags": [],
            "thumbnail": "",
            "platform": "unknown"
        }

    combined_text = f"{metadata['title']} {metadata['description']}".strip()
    
    # Run analysis concurrently using free HuggingFace endpoints
    emotion_task = asyncio.create_task(analyze_emotion(combined_text))
    toxicity_task = asyncio.create_task(analyze_toxicity(combined_text))
    alignment_task = asyncio.create_task(compute_alignment(combined_text, user_goals))
    
    emotion_result, toxicity_result, alignment_tuple = await asyncio.gather(emotion_task, toxicity_task, alignment_task)
    
    emotions = emotion_result.get("scores", {})
    dominant_emotion = emotion_result.get("dominant", "neutral")
    
    toxicity = {
        "overall": toxicity_result.get("overall", 0.0), 
        "categories": {toxicity_result.get("label", "safe"): toxicity_result.get("overall", 0.0)}
    }
    
    goal_alignment = {
        "score": alignment_tuple[0], 
        "reason": alignment_tuple[1],
        "matched_goals": [user_goals[0]] if user_goals else []
    }
    
    # Simple recommendation heuristic
    recommendation = "consume"
    if toxicity["overall"] > 0.5 or (goal_alignment["score"] < 0.2 and dominant_emotion in ["anger", "fear", "disgust"]):
        recommendation = "skip"

    # Generate advanced insight via Gemini
    content_data_for_insight = {
        "title": metadata["title"],
        "platform": metadata["platform"],
        "dominant_emotion": dominant_emotion,
        "emotion_score": emotions.get(dominant_emotion, 0.0) if emotions else 0.0,
        "toxicity_score": toxicity["overall"],
        "alignment_score": goal_alignment["score"]
    }
    user_data_for_insight = {
        "goals": user_goals,
        "drift_score": 0.0 # Default drift score
    }
    insight = await generate_insight(content_data_for_insight, user_data_for_insight)

    result = {
        "url": url,
        "title": metadata["title"],
        "platform": metadata["platform"],
        "thumbnail": metadata["thumbnail"],
        "emotions": emotions,
        "dominant_emotion": dominant_emotion,
        "toxicity": toxicity,
        "goal_alignment": goal_alignment,
        "content_tags": metadata["tags"],
        "recommendation": recommendation,
        "insight": insight,
        "processed_at": datetime.utcnow().isoformat() + "Z"
    }
    
    redis_cache.set(cache_key, result, 86400) # Cache for 24h
    return result

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(request: AnalyzeRequest):
    try:
        result = await process_url(request.url, request.user_goals)
        return AnalyzeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/batch", response_model=list[AnalyzeResponse])
async def batch_analyze_endpoint(request: BatchAnalyzeRequest):
    if len(request.urls) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 URLs allowed per batch")
        
    try:
        tasks = [process_url(url, request.user_goals) for url in request.urls]
        results = await asyncio.gather(*tasks)
        return [AnalyzeResponse(**r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommend")
async def recommend_endpoint(goals: list[str] = Query([]), limit: int = 10):
    # This is a stub for YouTube search-based recommendations
    # Due to API quota constraints, we return a mock structure
    return {
        "message": "Recommendations generated",
        "goals_considered": goals,
        "recommendations": []
    }

@app.post("/drift/calculate", response_model=DriftResponse)
async def calculate_drift(request: DriftRequest):
    if not request.content_logs:
        return {"drift_score": 0.0, "breakdown": {"alignment": 0, "consistency": 0}}
        
    total_alignment = sum(log.score for log in request.content_logs if log.isConscious)
    avg_alignment = total_alignment / len(request.content_logs)
    
    # -100 to 100 scale. Base is alignment score (0-100)
    # If mostly unconscious, score drops negative
    conscious_ratio = sum(1 for l in request.content_logs if l.isConscious) / len(request.content_logs)
    
    drift = (conscious_ratio * 200) - 100 # map 0-1 to -100 to +100
    
    # Adjust by avg alignment quality
    final_drift = drift * (avg_alignment / 100.0) if drift > 0 else drift
    
    return {
        "drift_score": round(max(-100.0, min(100.0, final_drift)), 2),
        "breakdown": {
            "conscious_ratio": round(conscious_ratio, 2),
            "avg_alignment_score": round(avg_alignment, 2)
        }
    }
