import logging
import warnings
from contextlib import asynccontextmanager

# Suppress FutureWarning from langchain_google_genai about deprecated google.generativeai
warnings.filterwarnings("ignore", category=FutureWarning, module="langchain_google_genai")


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.memory.cache import init_cache
from app.memory.document_store import init_document_store
from app.memory.vector_store import init_vector_store, vector_stats
from app.routers import agents, auth, memory, websockets, workflows


settings = get_settings()


def create_embeddings(settings):
    if settings.GEMINI_API_KEY:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            return GoogleGenerativeAIEmbeddings(
                model=settings.GEMINI_EMBEDDING_MODEL,
                google_api_key=settings.GEMINI_API_KEY
            )
        except ModuleNotFoundError:
            logging.getLogger("agentsphere").warning(
                "langchain_google_genai is not installed; trying local Ollama embeddings"
            )

    try:
        from langchain_ollama import OllamaEmbeddings
        return OllamaEmbeddings(
            model=settings.OLLAMA_EMBEDDING_MODEL,
            base_url=settings.OLLAMA_BASE_URL
        )
    except ModuleNotFoundError:
        logging.getLogger("agentsphere").warning(
            "langchain_ollama is not installed; vector embeddings will use local fallback"
        )

    return None


def configure_logging() -> None:
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger = logging.getLogger("agentsphere")
    logger.info("starting_agentsphere_backend")

    mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    embeddings = create_embeddings(settings)

    app.state.mongo_client = mongo_client
    app.state.db = mongo_client[settings.MONGODB_DB_NAME]
    app.state.redis = redis_client

    init_document_store(app.state.db)
    init_cache(redis_client)
    init_vector_store(embeddings, settings.FAISS_INDEX_PATH)

    try:
        yield
    finally:
        logger.info("stopping_agentsphere_backend")
        await redis_client.aclose()
        mongo_client.close()


app = FastAPI(
    title="AgentSphere AI Backend",
    version="1.0.0",
    description="Enterprise Agentic AI Platform backend for B2B customer discovery and prospect intelligence.",
    lifespan=lifespan,
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(workflows.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")
app.include_router(memory.router, prefix="/api/v1")
app.include_router(websockets.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    checks = {"app": "ok", "mongodb": "unknown", "redis": "unknown", "vector_store": vector_stats()}
    try:
        await app.state.db.command("ping")
        checks["mongodb"] = "ok"
    except Exception as exc:
        checks["mongodb"] = f"error: {exc}"
    try:
        await app.state.redis.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc}"

    # Report which API keys are configured
    checks["api_keys"] = {
        "GEMINI_API_KEY": bool(settings.GEMINI_API_KEY),
        "OLLAMA_BASE_URL": bool(settings.OLLAMA_BASE_URL),
        "SERPER_API_KEY": bool(settings.SERPER_API_KEY),
        "HUNTER_API_KEY": bool(settings.HUNTER_API_KEY),
        "FAISS_INDEX_PATH": bool(settings.FAISS_INDEX_PATH),
    }

    return {"status": "ok" if checks["mongodb"] == "ok" and checks["redis"] == "ok" else "degraded", "checks": checks}
