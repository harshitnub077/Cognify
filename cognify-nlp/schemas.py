"""
Pydantic schemas for Cognify NLP API v2.
"""
from pydantic import BaseModel, Field
from typing import Optional


# ── Analyze ──────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    url: str
    title: Optional[str] = None
    transcript: Optional[str] = None
    user_goals: list[str] = []
    user_id: Optional[str] = None  # when present, stores result in content store


class EmotionScores(BaseModel):
    joy: float = 0.0
    anger: float = 0.0
    fear: float = 0.0
    sadness: float = 0.0
    surprise: float = 0.0
    disgust: float = 0.0
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


# ── Coach ─────────────────────────────────────────────────────────────────────

class DriftRequest(BaseModel):
    user_id: str = Field(..., description="Supabase user UUID")
    goals: list[str] = Field(default=[], description="User's stated life goals")
    limit: int = Field(default=20, ge=5, le=50, description="Number of recent items to analyze")


class DriftResponse(BaseModel):
    drift_score: int = Field(..., ge=0, le=100, description="0=on track, 100=off the rails")
    brutal_truth: str = Field(..., description="One punchy sentence naming a specific pattern")
    pattern: str = Field(..., description="Behavioral pattern in their watch history")
    algorithm_fix: str = Field(..., description="Concrete action to retrain their feed")
    bright_spot: str = Field(..., description="One genuine positive observation")
    top_goal_gap: str = Field(..., description="Most ignored goal")
    items_analyzed: int
    avg_alignment_score: float
    emotion_profile: dict
    verdict_distribution: dict
    topic_clusters: list[str]


# ── Recommend ─────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    user_goals: list[str]
    emotional_state: dict = {}
    drift_score: float = 50.0
    limit: int = 5


# ── Search ────────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    title: str
    url: str
    platform: str
    alignment_score: float
    dominant_emotion: str
    verdict: str
    analyzed_at: str
    similarity_score: float
