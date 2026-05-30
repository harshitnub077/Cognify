import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
    PERSPECTIVE_API_KEY = os.getenv("PERSPECTIVE_API_KEY", "")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Model Configurations
    EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"
    ALIGNMENT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Thresholds
    MAX_TEXT_LENGTH = 512

config = Config()
