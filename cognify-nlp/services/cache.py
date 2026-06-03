import os
import json
import hashlib
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

try:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
    CACHE_ENABLED = True
except Exception as e:
    print(f"⚠️ Redis connection failed: {e}. Running without cache.")
    CACHE_ENABLED = False

def generate_key(url: str, goals: list[str]) -> str:
    raw = f"{url}_{','.join(sorted(goals))}"
    return hashlib.md5(raw.encode()).hexdigest()

def get_cached_analysis(url: str, goals: list[str]):
    if not CACHE_ENABLED:
        return None
    key = generate_key(url, goals)
    try:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    except:
        return None

def set_cached_analysis(url: str, goals: list[str], data: dict):
    if not CACHE_ENABLED:
        return
    key = generate_key(url, goals)
    try:
        # 7-day TTL (604800 seconds)
        redis_client.setex(key, 604800, json.dumps(data))
    except:
        pass
