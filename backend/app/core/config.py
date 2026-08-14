from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_ENV: str = "development"
    SECRET_KEY: str = "change_me_in_production"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: list[str] | str = Field(default_factory=lambda: ["http://localhost:5173"])

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "agentsphere"

    REDIS_URL: str = "redis://localhost:6379/0"

    FAISS_INDEX_PATH: str = "./data/faiss_index"

    CLERK_SECRET_KEY: str | None = None
    CLERK_JWKS_URL: str | None = None

    SERPER_API_KEY: str | None = None
    HUNTER_API_KEY: str | None = None

    CELERY_TASK_ALWAYS_EAGER: bool = False

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return value
        return ["http://localhost:5173"]

    @property
    def docs_enabled(self) -> bool:
        return self.APP_ENV.lower() != "production"

    @property
    def clerk_issuer(self) -> str | None:
        if not self.CLERK_JWKS_URL:
            return None
        marker = "/.well-known/jwks.json"
        if self.CLERK_JWKS_URL.endswith(marker):
            return self.CLERK_JWKS_URL[: -len(marker)]
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()
