import os, hashlib, json, asyncio
import google.generativeai as genai
from huggingface_hub import InferenceClient
import redis.asyncio as redis

# --- Setup ---
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))  # free, no card
hf_client = InferenceClient(token=os.environ.get("HF_TOKEN", ""))  # free token
redis_client = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"))

EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"
TOXICITY_MODEL = "unitary/toxic-bert"
GEMINI_MODEL = "gemini-2.5-flash"

# --- Cache helper ---
async def get_cache(key: str):
    try:
        val = await redis_client.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None

async def set_cache(key: str, data: dict, ttl: int = 86400):
    try:
        await redis_client.setex(key, ttl, json.dumps(data))
    except Exception:
        pass

# --- Emotion detection via HuggingFace (FREE) ---
async def analyze_emotion(text: str) -> dict:
    cache_key = f"emotion:{hashlib.md5(text[:200].encode()).hexdigest()}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    try:
        results = hf_client.text_classification(
            text[:512], model=EMOTION_MODEL
        )
        scores = {r["label"].lower(): round(r["score"], 4) for r in results}
        
        # Enforce all 7 keys for Pydantic validation
        for key in ["joy", "anger", "fear", "sadness", "surprise", "disgust", "neutral"]:
            if key not in scores:
                scores[key] = 0.0
                
        dominant = max(scores, key=scores.get)
        result = {"scores": scores, "dominant": dominant}
    except Exception:
        # Fallback: keyword-based heuristic
        result = keyword_emotion_fallback(text)

    await set_cache(cache_key, result, ttl=7*86400)
    return result

# --- Toxicity detection via HuggingFace (FREE) ---
async def analyze_toxicity(text: str) -> dict:
    cache_key = f"toxic:{hashlib.md5(text[:200].encode()).hexdigest()}"
    cached = await get_cache(cache_key)
    if cached:
        return cached

    try:
        results = hf_client.text_classification(
            text[:512], model=TOXICITY_MODEL
        )
        score = next((r["score"] for r in results if r["label"] == "toxic"), 0.0)
        result = {"overall": round(score, 4), "label": "toxic" if score > 0.5 else "safe"}
    except Exception:
        result = {"overall": 0.0, "label": "safe"}  # safe fallback

    await set_cache(cache_key, result, ttl=7*86400)
    return result

# --- Goal alignment via local SentenceTransformers (FREE, no API) ---
from sentence_transformers import SentenceTransformer, util
_st_model = None

def get_st_model():
    global _st_model
    if _st_model is None:
        _st_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _st_model

async def compute_alignment(content_text: str, user_goals: list[str]) -> tuple[float, str]:
    if not user_goals:
        return 0.0, "No user goals provided"
    
    # Run heavy embedding synchronously in a thread to unblock the async loop
    import asyncio
    model = get_st_model()
    
    def _compute():
        content_emb = model.encode(content_text, convert_to_tensor=True)
        goal_embs = model.encode(user_goals, convert_to_tensor=True)
        similarities = util.cos_sim(content_emb, goal_embs)[0]
        score = float(similarities.max())
        best_goal = user_goals[int(similarities.argmax())]
        return round(score, 4), f"Best match: '{best_goal}' ({score:.0%} similarity)"
        
    return await asyncio.to_thread(_compute)

# --- Simple keyword fallback for emotion ---
def keyword_emotion_fallback(text: str) -> dict:
    text_lower = text.lower()
    scores = {"joy":0.1,"anger":0.1,"fear":0.1,"sadness":0.1,"surprise":0.1,"disgust":0.1,"neutral":0.1}
    anger_words = ["hate","angry","rage","stupid","idiot","fight","war","attack"]
    joy_words = ["happy","amazing","love","great","awesome","success","win","best"]
    fear_words = ["scary","dangerous","warning","crisis","disaster","threat","afraid"]
    for w in anger_words:
        if w in text_lower: scores["anger"] += 0.15
    for w in joy_words:
        if w in text_lower: scores["joy"] += 0.15
    for w in fear_words:
        if w in text_lower: scores["fear"] += 0.15
    total = sum(scores.values())
    scores = {k: round(v/total, 4) for k,v in scores.items()}
    return {"scores": scores, "dominant": max(scores, key=scores.get)}
