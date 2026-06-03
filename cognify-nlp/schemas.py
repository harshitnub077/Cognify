from pydantic import BaseModel
from typing import Optional, Dict

class AnalyzeRequest(BaseModel):
    url: str
    title: Optional[str] = None
    transcript: Optional[str] = None
    user_goals: list[str] = []

class EmotionScores(BaseModel):
    joy: float
    anger: float
    fear: float
    sadness: float
    surprise: float
    disgust: float
    neutral: float = 0.0

class ToxicityScore(BaseModel):
    overall: float
    label: str

class GoalAlignment(BaseModel):
    score: float
    reason: str

class Insight(BaseModel):
    verdict: str
    text: str
    identity_impact: str

class AnalyzeResponse(BaseModel):
    url: str
    title: str
    platform: str
    thumbnail: Optional[str]
    emotions: EmotionScores | dict
    dominant_emotion: str
    toxicity: ToxicityScore | dict
    goal_alignment: GoalAlignment | dict
    insight: Insight | dict
    cached: bool
    analyzed_at: str
