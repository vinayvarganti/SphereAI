import httpx

from app.core.config import get_settings
from app.core.exceptions import RateLimitError
from app.services.common import retry_async


class HunterService:
    BASE_URL = "https://api.hunter.io/v2"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key if api_key is not None else get_settings().HUNTER_API_KEY

    async def find_email(self, domain: str, first_name: str, last_name: str) -> dict:
        if not self.api_key or not domain:
            return {"email": None, "confidence": 0, "sources": []}

        async def request() -> dict:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/email-finder",
                    params={
                        "domain": domain,
                        "first_name": first_name,
                        "last_name": last_name,
                        "api_key": self.api_key,
                    },
                )
                if response.status_code == 429:
                    raise RateLimitError("Hunter API rate limit exceeded")
                response.raise_for_status()
                payload = response.json().get("data", {})
            return {
                "email": payload.get("email"),
                "confidence": (payload.get("score") or 0) / 100,
                "sources": payload.get("sources") or [],
            }

        return await retry_async(request)
