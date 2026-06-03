from fastapi import APIRouter
from datetime import datetime
import asyncio
from schemas import AnalyzeRequest, AnalyzeResponse
from services.youtube import fetch_youtube_metadata
from services.emotion import get_emotion
from services.toxicity import get_toxicity
from services.alignment import get_alignment_score
from services.gemini import generate_insight_and_score
from services.cache import get_cached_analysis, set_cached_analysis
from services.transcript import get_video_transcript

router = APIRouter()

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_url(req: AnalyzeRequest):
    # 1. Check cache
    cached_data = get_cached_analysis(req.url, req.user_goals)
    if cached_data:
        cached_data["cached"] = True
        return cached_data

    # 2. Fetch metadata
    if req.title:
        title = req.title
        metadata = {"title": title, "platform": "youtube", "thumbnail": None}
    else:
        metadata = fetch_youtube_metadata(req.url)
        title = metadata.get("title", "Unknown Title")
        
    # 2.5 Fetch Transcript
    if req.transcript:
        transcript = req.transcript
    else:
        transcript = get_video_transcript(req.url)

    # 3. Run all three analyses IN PARALLEL — cuts ~3.6s sequential down to ~2s
    #    (limited only by the slowest single call, not the sum of all three)
    emotion_data, toxicity_data, insight_data = await asyncio.gather(
        asyncio.to_thread(get_emotion, title),
        asyncio.to_thread(get_toxicity, title),
        asyncio.to_thread(generate_insight_and_score, title, req.user_goals, transcript),
    )
    alignment_score = insight_data.get("score", 50)
    
    # Assemble response
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
            "reason": insight_data.get("text", "Aligned with goals.")
        },
        "insight": insight_data,
        "cached": False,
        "analyzed_at": datetime.utcnow().isoformat() + "Z"
    }

    # Save to cache
    set_cached_analysis(req.url, req.user_goals, response_data)

    return response_data
