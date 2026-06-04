from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.content_store import semantic_search_content

router = APIRouter(tags=["Search"])

class SearchRequest(BaseModel):
    user_id: str
    query: str
    limit: int = 10

@router.post("/search")
async def search_history(req: SearchRequest):
    """
    Perform a semantic search over a user's stored content history.
    """
    try:
        results = await semantic_search_content(
            user_id=req.user_id,
            query=req.query,
            limit=req.limit
        )
        return {"data": results}
    except Exception as e:
        print(f"[Search] Error performing semantic search: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform semantic search")
