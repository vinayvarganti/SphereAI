from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceNotConfiguredError, UnauthorizedError
from app.core.security import UserContext, authorization_header_to_token, verify_clerk_token


async def get_db(request: Request) -> AsyncIOMotorDatabase:
    database = getattr(request.app.state, "db", None)
    if database is None:
        raise ExternalServiceNotConfiguredError("MongoDB is not initialized")
    return database


async def get_redis(request: Request) -> Redis:
    redis_client = getattr(request.app.state, "redis", None)
    if redis_client is None:
        raise ExternalServiceNotConfiguredError("Redis is not initialized")
    return redis_client


async def get_vector_store(request: Request):
    from app.memory.vector_store import vector_stats
    stats = vector_stats()
    return stats


async def get_current_user(authorization: Annotated[str | None, Header()] = None) -> UserContext:
    settings = get_settings()

    # ── Development mode ────────────────────────────────────────────────────────
    # Try to verify the JWT if one is supplied. If verification fails for any
    # reason (stale token, wrong key, missing header) return a local dev user so
    # the UI is never blocked by a 403 during local development.
    if settings.APP_ENV.lower() == "development":
        if authorization:
            try:
                token = authorization_header_to_token(authorization)
                return await verify_clerk_token(token)
            except Exception:
                # Token invalid in dev — fall through to dev user
                pass
        # No header or bad token in dev → use a generic local user
        return UserContext(
            user_id="local_dev_user",
            email="dev@agentsphere.local",
            roles=[],
        )

    # ── Production mode ─────────────────────────────────────────────────────────
    # Strict verification — no fallback allowed.
    token = authorization_header_to_token(authorization)
    return await verify_clerk_token(token)


def require_role(role: str) -> Callable[[UserContext], UserContext]:
    async def guard(user: Annotated[UserContext, Depends(get_current_user)]) -> UserContext:
        if role not in user.roles:
            raise UnauthorizedError(f"Role '{role}' is required")
        return user

    return guard
