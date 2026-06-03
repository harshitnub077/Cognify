import requests
import os

HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://api-inference.huggingface.co/models/unitary/toxic-bert"
headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

def get_toxicity(text: str) -> dict:
    fallback_response = {"overall": 0.0, "label": "safe"}
    
    if not HF_TOKEN:
        return fallback_response

    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": text}, timeout=3)
        if response.status_code == 200:
            results = response.json()
            if isinstance(results, list) and len(results) > 0:
                # Results usually come back sorted by score
                # toxic-bert returns toxic, severe_toxic, obscene, threat, insult, identity_hate
                max_score = 0.0
                for item in results[0]:
                    if item['label'] == 'toxic':
                        max_score = item['score']
                        break
                
                label = "toxic" if max_score > 0.5 else "safe"
                return {"overall": max_score, "label": label}
        return fallback_response
    except Exception as e:
        print(f"Toxicity API failed: {e}")
        return fallback_response
