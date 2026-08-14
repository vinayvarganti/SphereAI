from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import get_current_user
from app.core.security import UserContext
from app.memory.cache import cache_stats, clear_session_context
from app.memory.document_store import document_stats
from app.memory.vector_store import search_similar_companies, vector_stats


router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/search")
async def semantic_search(
    q: str = Query(min_length=1),
    namespace: str = Query(default="companies"),
    top_k: int = Query(default=5, ge=1, le=25),
    user: UserContext = Depends(get_current_user),
) -> dict:
    results = await search_similar_companies(q, top_k=top_k)
    scoped = [
        result
        for result in results
        if not result.get("metadata", {}).get("user_id") or result.get("metadata", {}).get("user_id") == user.user_id
    ]
    return {"namespace": namespace, "results": scoped}


@router.get("/stats")
async def stats(user: UserContext = Depends(get_current_user)) -> dict:
    return {
        "cache": cache_stats(),
        "vector": vector_stats(),
        "documents": await document_stats(user.user_id),
    }


@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_session(
    session_id: str,
    user: UserContext = Depends(get_current_user),
) -> None:
    await clear_session_context(session_id)
