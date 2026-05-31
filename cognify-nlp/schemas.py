from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

class AnalyzeRequest(BaseModel):
    url: str
    user_goals: List[str]

class BatchAnalyzeRequest(BaseModel):
    urls: List[str]
    user_goals: List[str]

class ContentLogModel(BaseModel):
    isConscious: bool
    score: int
    tags: List[str]

class DriftRequest(BaseModel):
    user_id: str
    content_logs: List[ContentLogModel]

class EmotionScores(BaseModel):
    joy: float
    anger: float
    fear: float
    sadness: float
    surprise: float
    disgust: float
    neutral: float

class ToxicityScores(BaseModel):
    overall: float
    categories: Dict[str, float]

class GoalAlignment(BaseModel):
    score: float
    matched_goals: List[str]
    reason: str

class AnalyzeResponse(BaseModel):
    url: str
    title: str
    platform: str
    thumbnail: Optional[str]
    emotions: EmotionScores
    dominant_emotion: str
    toxicity: ToxicityScores
    goal_alignment: GoalAlignment
    content_tags: List[str]
    recommendation: str
    processed_at: str

class DriftResponse(BaseModel):
    drift_score: float
    breakdown: Dict[str, float]
