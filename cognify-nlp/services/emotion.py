import os
import requests

HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base"
headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

# Load local pipeline lazily if needed
local_pipeline = None

def get_emotion(text: str) -> dict:
    default_scores = {"joy": 0.0, "anger": 0.0, "fear": 0.0, "sadness": 0.0, "surprise": 0.0, "disgust": 0.0, "neutral": 0.0}
    
    # 1. Try HuggingFace Inference API
    if HF_TOKEN:
        try:
            response = requests.post(API_URL, headers=headers, json={"inputs": text}, timeout=3)
            if response.status_code == 200:
                results = response.json()
                if isinstance(results, list) and len(results) > 0:
                    scores = default_scores.copy()
                    for item in results[0]:
                        label = item['label'].lower()
                        if label in scores:
                            scores[label] = item['score']
                    dominant = max(scores, key=scores.get)
                    return {"emotions": scores, "dominant_emotion": dominant}
        except:
            pass

    # 2. Local Transformers Pipeline Removed (OOM fix)
    # Using Keyword Heuristic Fallback directly

    # 3. Keyword Heuristic Fallback
    text_lower = text.lower()
    scores = default_scores.copy()
    if any(w in text_lower for w in ['happy', 'great', 'awesome', 'good', 'joy']):
        scores['joy'] = 0.8
    elif any(w in text_lower for w in ['angry', 'mad', 'hate', 'rage', 'awful']):
        scores['anger'] = 0.8
    elif any(w in text_lower for w in ['sad', 'depressed', 'cry', 'upset']):
        scores['sadness'] = 0.8
    else:
        scores['neutral'] = 0.8
    
    dominant = max(scores, key=scores.get)
    return {"emotions": scores, "dominant_emotion": dominant}
