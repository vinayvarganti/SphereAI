import json
from typing import Any
from uuid import uuid4

from redis.asyncio import Redis

from app.core.exceptions import ExternalServiceNotConfiguredError


_redis: Redis | None = None
_lock_tokens: dict[str, str] = {}
_metrics = {"hits": 0, "misses": 0, "sets": 0, "deletes": 0}


def init_cache(redis_client: Redis) -> None:
    global _redis
    _redis = redis_client


def get_redis_client() -> Redis:
    if _redis is None:
        raise ExternalServiceNotConfiguredError("Redis cache is not initialized")
    return _redis


async def get_cached(key: str) -> dict | list | str | int | float | None:
    value = await get_redis_client().get(key)
    if value is None:
        _metrics["misses"] += 1
        return None
    _metrics["hits"] += 1
    if isinstance(value, bytes):
        value = value.decode("utf-8")
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


async def set_cached(key: str, value: Any, ttl_seconds: int) -> None:
    _metrics["sets"] += 1
    await get_redis_client().set(key, json.dumps(value, default=str), ex=ttl_seconds)


async def delete_cached(key: str) -> None:
    _metrics["deletes"] += 1
    await get_redis_client().delete(key)


async def acquire_lock(key: str, timeout_seconds: int = 30) -> bool:
    token = uuid4().hex
    acquired = await get_redis_client().set(key, token, nx=True, ex=timeout_seconds)
    if acquired:
        _lock_tokens[key] = token
    return bool(acquired)


async def release_lock(key: str) -> None:
    token = _lock_tokens.pop(key, None)
    if not token:
        return
    script = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    end
    return 0
    """
    await get_redis_client().eval(script, 1, key, token)


async def store_session_context(session_id: str, context: dict) -> None:
    await set_cached(f"session:{session_id}:context", context, 3600)


async def get_session_context(session_id: str) -> dict | None:
    cached = await get_cached(f"session:{session_id}:context")
    return cached if isinstance(cached, dict) else None


async def clear_session_context(session_id: str) -> None:
    await delete_cached(f"session:{session_id}:context")


def cache_stats() -> dict:
    hits = _metrics["hits"]
    misses = _metrics["misses"]
    total = hits + misses
    return {
        **_metrics,
        "hit_rate": round(hits / total, 4) if total else 0.0,
    }
