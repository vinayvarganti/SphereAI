import httpx

from app.core.config import get_settings
from app.core.exceptions import RateLimitError
from app.services.common import retry_async


class ApolloService:
    BASE_URL = "https://api.apollo.io/v1"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key

    async def find_contact(self, name: str, company: str, linkedin_url: str | None = None) -> dict:
        if not self.api_key:
            return {"phone": None, "linkedin_url": linkedin_url, "email": None, "employment_history": []}

        async def request() -> dict:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/people/match",
                    headers={"Cache-Control": "no-cache", "Content-Type": "application/json"},
                    json={
                        "api_key": self.api_key,
                        "name": name,
                        "organization_name": company,
                        "linkedin_url": linkedin_url,
                    },
                )
                if response.status_code == 429:
                    raise RateLimitError("Apollo API rate limit exceeded")
                response.raise_for_status()
                payload = response.json().get("person") or {}
            phones = payload.get("phone_numbers") or []
            first_phone = phones[0].get("raw_number") if phones and isinstance(phones[0], dict) else payload.get("phone")
            return {
                "phone": first_phone,
                "linkedin_url": payload.get("linkedin_url") or linkedin_url,
                "email": payload.get("email"),
                "employment_history": payload.get("employment_history") or [],
            }

        return await retry_async(request)
