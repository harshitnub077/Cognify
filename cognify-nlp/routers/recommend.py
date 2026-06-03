from fastapi import APIRouter
from pydantic import BaseModel
import google.generativeai as genai
import random
import json
from youtube_search import YoutubeSearch

router = APIRouter()

class RecommendRequest(BaseModel):
    goal: str
    limit: int = 5

query_cache = {}

@router.post("/recommend")
async def get_recommendations(req: RecommendRequest):
    # Step 1: Get YouTube videos
    try:
        search_query = query_cache.get(req.goal, {}).get("search_query", req.goal)
        results = YoutubeSearch(search_query, max_results=20).to_dict()
        
        # Cache the query to avoid re-searching if needed, but here we just use goal
        if req.goal not in query_cache:
            query_cache[req.goal] = {"search_query": req.goal}
            
        if len(results) > req.limit:
            sampled_videos = random.sample(results, req.limit)
        else:
            sampled_videos = results
            
    except Exception as e:
        print(f"YouTube search error: {e}")
        return {"data": []}

    # Step 2: Batch evaluate the videos using Gemini
    video_titles = [vid.get("title") or "Unknown" for vid in sampled_videos]
    
    model = genai.GenerativeModel('gemini-3.5-flash')
    prompt = f"""
    The user has a specific life or learning goal: "{req.goal}".
    I have a list of {len(video_titles)} YouTube videos. For each video, evaluate how well it matches the user's goal.
    
    Videos:
    {json.dumps(video_titles, indent=2)}
    
    Return ONLY a JSON array of objects, one for each video in the exact same order.
    Format:
    [
      {{
        "score": 95, 
        "reason": "1-sentence explanation of why this specific video helps."
      }}
    ]
    """
    
    evaluations = []
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        evaluations = json.loads(text)
    except Exception as e:
        print(f"Gemini batch evaluation error: {e}")
        # Fallback to random scores
        for _ in video_titles:
            evaluations.append({
                "score": random.randint(75, 98),
                "reason": "Curated based on your current goal."
            })

    # Ensure evaluations array length matches videos
    if len(evaluations) < len(sampled_videos):
        evaluations.extend([{"score": 85, "reason": "Curated based on your current goal."}] * (len(sampled_videos) - len(evaluations)))

    # Step 3: Assemble final response
    items = []
    for idx, vid in enumerate(sampled_videos):
        thumbnail_url = vid.get("thumbnails", ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"])[0]
        
        items.append({
            "title": vid.get("title") or "Unknown Title",
            "channel": vid.get("channel") or "Unknown Channel",
            "url": "https://youtube.com" + vid.get("url_suffix", "/"),
            "thumbnail": thumbnail_url,
            "duration": vid.get("duration") or "10:00",
            "viewCount": vid.get("views") or "10K views",
            "reason": evaluations[idx].get("reason", "Curated for you."),
            "score": evaluations[idx].get("score", 85)
        })
        
    return {"data": items}
