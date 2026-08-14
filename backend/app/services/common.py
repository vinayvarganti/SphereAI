import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx

from app.core.exceptions import RateLimitError


T = TypeVar("T")


async def retry_async(operation: Callable[[], Awaitable[T]], max_retries: int = 3) -> T:
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            return await operation()
        except RateLimitError:
            last_error = RateLimitError("External API rate limit exceeded")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                last_error = RateLimitError("External API rate limit exceeded")
            elif 500 <= exc.response.status_code < 600:
                last_error = exc
            else:
                raise
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last_error = exc
        if attempt < max_retries - 1:
            await asyncio.sleep(2**attempt)
    assert last_error is not None
    raise last_error
