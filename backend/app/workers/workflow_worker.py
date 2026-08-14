import asyncio
import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from redis.asyncio import Redis

from app.agents.common import publish_workflow_event
from app.core.config import get_settings
from app.memory.cache import init_cache, store_session_context
from app.memory.document_store import init_document_store, update_workflow_status
from app.memory.vector_store import init_vector_store
from app.workers.celery_app import celery_app


logger = logging.getLogger("agentsphere.worker")


def create_worker_embeddings(settings):
    if settings.GEMINI_API_KEY:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            return GoogleGenerativeAIEmbeddings(
                model=settings.GEMINI_EMBEDDING_MODEL,
                google_api_key=settings.GEMINI_API_KEY
            )
        except ModuleNotFoundError:
            logger.warning("langchain_google_genai is not installed; worker embeddings will try local Ollama")

    try:
        from langchain_ollama import OllamaEmbeddings
        return OllamaEmbeddings(
            model=settings.OLLAMA_EMBEDDING_MODEL,
            base_url=settings.OLLAMA_BASE_URL
        )
    except ModuleNotFoundError:
        logger.warning("langchain_ollama is not installed; worker embeddings will use local fallback")

    return None


@celery_app.task(bind=True, max_retries=3)
def run_workflow_task(self, workflow_id: str, workflow_config: dict):
    try:
        return asyncio.run(_run_workflow_async(workflow_id, workflow_config))
    except Exception as exc:
        retries = getattr(self.request, "retries", 0)
        if retries >= self.max_retries:
            logger.exception("workflow_task_failed", extra={"workflow_id": workflow_id})
            raise
        countdown = 2**retries
        raise self.retry(exc=exc, countdown=countdown)


async def _run_workflow_async(
    workflow_id: str,
    workflow_config: dict,
    *,
    redis: Redis | None = None,
    db: AsyncIOMotorDatabase | None = None,
) -> dict:
    """Execute the workflow graph.

    Parameters
    ----------
    redis:
        Optional pre-initialised Redis client (e.g. from the FastAPI app).
        When provided the function will NOT close it on exit.
    db:
        Optional pre-initialised Motor database (e.g. from the FastAPI app).
        When provided the function will NOT close its parent client.
    """
    settings = get_settings()

    # -- Client setup ----------------------------------------------------------
    _owns_redis = redis is None
    _owns_mongo = db is None

    if _owns_redis:
        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    mongo_client: AsyncIOMotorClient | None = None
    if _owns_mongo:
        mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
        db = mongo_client[settings.MONGODB_DB_NAME]

    init_document_store(db)
    init_cache(redis)

    embeddings = create_worker_embeddings(settings)
    init_vector_store(embeddings, settings.FAISS_INDEX_PATH)

    user_id = workflow_config["user_id"]
    state = {
        "session_id": workflow_config["session_id"],
        "workflow_id": workflow_id,
        "user_id": user_id,
        "icp": workflow_config["icp"],
        "personas": workflow_config["personas"],
        "triggers": workflow_config["triggers"],
        "execution_plan": None,
        "raw_signals": [],
        "discovered_companies": [],
        "validated_companies": [],
        "decision_makers": [],
        "enriched_contacts": [],
        "summary_report": None,
        "approval_status": None,
        "agent_logs": [],
        "total_tokens": 0,
        "total_cost_usd": 0.0,
        "errors": [],
    }

    try:
        await update_workflow_status(workflow_id, "running", user_id=user_id)
        await publish_workflow_event(workflow_id, user_id, "progress", "workflow_worker", {"message": "Workflow started"})
        try:
            from app.graph.workflow_graph import build_workflow_graph
        except ModuleNotFoundError as exc:
            raise RuntimeError("LangGraph is required to execute workflows. Install backend requirements first.") from exc
        graph = build_workflow_graph()
        result = await graph.ainvoke(state)
        await store_session_context(
            workflow_config["session_id"],
            {
                "last_workflow_id": workflow_id,
                "companies": result.get("validated_companies", []),
                "contacts": result.get("enriched_contacts", []),
            },
        )
        await publish_workflow_event(
            workflow_id,
            user_id,
            "log",
            "workflow_worker",
            {"message": "Workflow graph finished and is waiting for approval"},
        )
        return {"workflow_id": workflow_id, "status": result.get("approval_status") or "awaiting_approval"}
    except Exception as exc:
        await update_workflow_status(workflow_id, "failed", user_id=user_id, error=str(exc))
        await publish_workflow_event(workflow_id, user_id, "error", "workflow_worker", {"message": str(exc)})
        raise
    finally:
        # Only close clients that *we* created; leave shared ones alone.
        if _owns_redis and redis is not None:
            await redis.aclose()
        if _owns_mongo and mongo_client is not None:
            mongo_client.close()
