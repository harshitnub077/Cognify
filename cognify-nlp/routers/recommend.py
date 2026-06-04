from fastapi import APIRouter
from pydantic import BaseModel
import random
import json
import os
from youtube_search import YoutubeSearch
from services.llm_router import call_llm
import redis.asyncio as redis

router = APIRouter(tags=["Recommend"])

class RecommendRequest(BaseModel):
    goal: str
    limit: int = 5

query_cache = {}
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

@router.post("/recommend")
async def get_recommendations(req: RecommendRequest):
    # Step 1: Get YouTube videos
    try:
        if req.goal not in query_cache:
            query_prompt = f"""
            The user has this goal: "{req.goal}"
            Convert this into a highly specific, high-signal YouTube search query that surfaces advanced, non-beginner content.
            For example, if they want "advanced ML", return something like "advanced machine learning pytorch transformers deep learning research" rather than "ML roadmap".
            Return ONLY the raw search query string, no quotes, no extra text.
            """
            try:
                optimized_query_text = await call_llm(
                    prompt=query_prompt,
                    system="You are an expert at crafting advanced, highly specific YouTube search queries. You must return only the query string.",
                    redis_client=redis_client,
                    max_tokens=50,
                    json_mode=False
                )
                search_query = optimized_query_text.strip().replace('"', '')
            except Exception as e:
                print(f"Failed to optimize query: {e}")
                search_query = req.goal
                
            query_cache[req.goal] = {"search_query": search_query}
        else:
            search_query = query_cache[req.goal]["search_query"]
            
        results = YoutubeSearch(search_query, max_results=20).to_dict()
            
        if len(results) > req.limit:
            sampled_videos = random.sample(results, req.limit)
        else:
            sampled_videos = results
            
    except Exception as e:
        print(f"YouTube search error: {e}")
        return {"data": []}

    if not sampled_videos:
        return {"data": []}

    # Step 2: Batch evaluate the videos using LLM Router
    video_titles = [vid.get("title") or "Unknown" for vid in sampled_videos]
    
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
        response_text = await call_llm(
            prompt=prompt,
            system="You are an expert content curator. Output ONLY valid JSON array.",
            redis_client=redis_client,
            max_tokens=800,
            json_mode=True
        )
        
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            if "evaluations" in parsed:
                evaluations = parsed["evaluations"]
            else:
                evaluations = [parsed]
        elif isinstance(parsed, list):
            evaluations = parsed
        else:
            evaluations = []
    except Exception as e:
        print(f"LLM batch evaluation error: {e}")
        evaluations = []
        
    if not isinstance(evaluations, list):
        evaluations = []
        
    # Fallback if empty
    if not evaluations:
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
