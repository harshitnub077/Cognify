from models.loader import model_loader
from config import config

def analyze_emotion(text: str) -> dict:
    default_scores = {
        "joy": 0.0, "anger": 0.0, "fear": 0.0, 
        "sadness": 0.0, "surprise": 0.0, "disgust": 0.0, "neutral": 1.0
    }
    
    if not text:
        return default_scores

    if not model_loader.emotion_classifier:
        print("Warning: Emotion classifier not loaded. Using fallback.")
        return default_scores
        
    try:
        # Split text into chunks of 1500 chars to avoid model max length errors and analyze whole video
        chunk_size = 1500
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)][:15] # up to 15 chunks
        
        all_scores = {k: 0.0 for k in default_scores}
        
        for chunk in chunks:
            results = model_loader.emotion_classifier(chunk)
            for item in results[0]:
                all_scores[item['label']] += item['score']
                
        scores = {}
        for label, total_score in all_scores.items():
            scores[label] = round(total_score / len(chunks), 4)
            
        return scores
    except Exception as e:
        print(f"Emotion analysis failed: {e}")
        return default_scores
