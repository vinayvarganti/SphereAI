import httpx

from app.core.config import get_settings
from app.core.exceptions import RateLimitError
from app.services.common import retry_async


class SerperService:
    BASE_URL = "https://google.serper.dev"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key if api_key is not None else get_settings().SERPER_API_KEY

    async def search(self, query: str, search_type: str = "news") -> list[dict]:
        if not self.api_key:
            return []

        endpoint = "/news" if search_type == "news" else "/search"

        async def request() -> list[dict]:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}{endpoint}",
                    headers={"X-API-KEY": self.api_key, "Content-Type": "application/json"},
                    json={"q": query, "num": 10},
                )
                if response.status_code == 429:
                    raise RateLimitError("Serper API rate limit exceeded")
                response.raise_for_status()
                payload = response.json()
            rows = payload.get("news") if endpoint == "/news" else payload.get("organic")
            rows = rows or []
            return [
                {
                    "title": row.get("title", ""),
                    "snippet": row.get("snippet", ""),
                    "link": row.get("link", ""),
                    "date": row.get("date"),
                    "source": row.get("source") or row.get("displayLink") or "serper",
                }
                for row in rows
            ]

        return await retry_async(request)
