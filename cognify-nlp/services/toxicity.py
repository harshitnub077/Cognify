import requests
import time
from config import config

def analyze_toxicity(text: str) -> dict:
    default_toxicity = {
        "overall": 0.0,
        "categories": {
            "TOXICITY": 0.0,
            "SEVERE_TOXICITY": 0.0,
            "INSULT": 0.0,
            "PROFANITY": 0.0,
            "IDENTITY_ATTACK": 0.0,
            "THREAT": 0.0
        }
    }
    
    if not text or not config.PERSPECTIVE_API_KEY or config.PERSPECTIVE_API_KEY.startswith("your_"):
        return default_toxicity

    url = f"https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key={config.PERSPECTIVE_API_KEY}"
    
    payload = {
        "comment": {"text": text[:2000]}, # Max length for API
        "languages": ["en"],
        "requestedAttributes": {
            "TOXICITY": {},
            "SEVERE_TOXICITY": {},
            "INSULT": {},
            "PROFANITY": {},
            "IDENTITY_ATTACK": {},
            "THREAT": {}
        }
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(url, json=payload)
            
            if response.status_code == 429: # Rate limit
                time.sleep(2 ** attempt)
                continue
                
            response.raise_for_status()
            data = response.json()
            
            categories = {}
            for attr, attr_data in data.get("attributeScores", {}).items():
                categories[attr] = round(attr_data["summaryScore"]["value"], 4)
                
            return {
                "overall": categories.get("TOXICITY", 0.0),
                "categories": categories
            }
        except Exception as e:
            print(f"Toxicity analysis failed on attempt {attempt+1}: {e}")
            time.sleep(2 ** attempt)
            
    return default_toxicity
