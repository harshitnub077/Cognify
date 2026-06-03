from fastapi import APIRouter
from services.cache import CACHE_ENABLED
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "cache_enabled": CACHE_ENABLED,
        "huggingface_token_present": bool(os.getenv("HF_TOKEN")),
        "gemini_token_present": bool(os.getenv("GEMINI_API_KEY")),
        "youtube_token_present": bool(os.getenv("YOUTUBE_API_KEY")),
        "groq_token_present": bool(os.getenv("GROQ_API_KEY"))
    }
