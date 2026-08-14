import pytest

from app.memory.cache import acquire_lock, get_cached, release_lock, set_cached
from app.memory.vector_store import check_duplicate, init_vector_store, store_company_embedding


@pytest.mark.asyncio
async def test_redis_cache_operations(fake_redis):
    await set_cached("cache:test", {"ok": True}, 60)
    assert await get_cached("cache:test") == {"ok": True}
    assert await acquire_lock("lock:test")
    await release_lock("lock:test")


@pytest.mark.asyncio
async def test_vector_store_fallback_duplicate_detection():
    init_vector_store(None, None)
    await store_company_embedding({"id": "co_1", "name": "Acme", "domain": "acme.com", "workflow_id": "wf_1"})
    assert await check_duplicate("acme.com")
