from models.loader import model_loader
import torch
import torch.nn.functional as F

def calculate_alignment(text: str, goals: list[str]) -> dict:
    default_alignment = {
        "score": 0.0,
        "matched_goals": [],
        "reason": "Unable to calculate goal alignment."
    }
    
    if not text or not goals or not model_loader.alignment_model:
        return default_alignment
        
    try:
        # Generate embeddings across chunks for better representation of long texts
        chunk_size = 1500
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)][:15]
        
        content_embs = model_loader.alignment_model.encode(chunks, convert_to_tensor=True)
        # Average the embeddings of all chunks to get a single content embedding
        content_emb = torch.mean(content_embs, dim=0)
        
        goal_embs = model_loader.alignment_model.encode(goals, convert_to_tensor=True)
        
        # Calculate cosine similarity
        cos_scores = F.cosine_similarity(content_emb.unsqueeze(0), goal_embs)
        
        # Find best matching goal
        best_score_idx = torch.argmax(cos_scores).item()
        best_score = float(cos_scores[best_score_idx])
        
        # Clamp score to 0-1
        normalized_score = max(0.0, min(1.0, best_score))
        
        matched_goals = []
        if normalized_score > 0.3:
            matched_goals = [goals[best_score_idx]]
            reason = f"Content aligns moderately with your goal: '{goals[best_score_idx]}'."
            if normalized_score > 0.6:
                reason = f"Content is highly aligned with your goal: '{goals[best_score_idx]}'."
        else:
            reason = "Content does not appear to align with any of your stated goals."
            
        return {
            "score": round(normalized_score, 4),
            "matched_goals": matched_goals,
            "reason": reason
        }
    except Exception as e:
        print(f"Alignment calculation failed: {e}")
        return default_alignment
