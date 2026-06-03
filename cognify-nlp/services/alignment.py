from sentence_transformers import SentenceTransformer, util
import torch

# Load locally (runs on CPU)
# We load it lazily to avoid blocking startup if not needed immediately
model = None

def get_alignment_score(text: str, goals: list[str]) -> float:
    if not goals or not text:
        return 0.0
        
    global model
    if model is None:
        model = SentenceTransformer('all-MiniLM-L6-v2')

    # Encode the content text
    text_emb = model.encode(text, convert_to_tensor=True)
    
    # Encode the goals and compute average similarity
    goal_text = " ".join(goals)
    goal_emb = model.encode(goal_text, convert_to_tensor=True)
    
    cosine_score = util.cos_sim(text_emb, goal_emb).item()
    
    # Convert from [-1, 1] to [0, 100]
    normalized_score = max(0, min(100, (cosine_score + 1) * 50))
    return normalized_score
