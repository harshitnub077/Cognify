import redis
import json
import hashlib
from typing import Optional, Any
from config import config

class RedisClient:
    def __init__(self):
        self.client = None
        
    def connect(self):
        try:
            self.client = redis.from_url(config.REDIS_URL, decode_responses=True)
            self.client.ping()
            print("Connected to Redis successfully.")
        except Exception as e:
            print(f"Failed to connect to Redis: {e}")
            self.client = None

    def get(self, key: str) -> Optional[Any]:
        if not self.client:
            return None
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except Exception:
            return None

    def set(self, key: str, value: Any, expire_seconds: int):
        if not self.client:
            return
        try:
            self.client.setex(key, expire_seconds, json.dumps(value))
        except Exception as e:
            print(f"Failed to set cache for {key}: {e}")

    @staticmethod
    def generate_key(prefix: str, data: str) -> str:
        md5_hash = hashlib.md5(data.encode('utf-8')).hexdigest()
        return f"{prefix}:{md5_hash}"

redis_cache = RedisClient()
