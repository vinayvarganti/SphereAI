import httpx

from app.core.config import get_settings
from app.core.exceptions import RateLimitError
from app.services.common import retry_async


class CrunchbaseService:
    BASE_URL = "https://api.crunchbase.com/api/v4"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key

    async def get_company(self, domain: str) -> dict:
        if not self.api_key or not domain:
            return {}

        async def autocomplete() -> str | None:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/autocompletes",
                    params={"query": domain, "collection_ids": "organizations", "user_key": self.api_key},
                )
                if response.status_code == 429:
                    raise RateLimitError("Crunchbase API rate limit exceeded")
                response.raise_for_status()
                entities = response.json().get("entities") or []
            if not entities:
                return None
            return entities[0].get("identifier", {}).get("uuid") or entities[0].get("uuid")

        async def entity(uuid: str) -> dict:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/entities/organizations/{uuid}",
                    params={
                        "field_ids": ",".join(
                            [
                                "identifier",
                                "short_description",
                                "website_url",
                                "categories",
                                "num_employees_enum",
                                "location_identifiers",
                                "linkedin",
                                "funding_stage",
                                "funding_total",
                                "updated_at",
                            ]
                        ),
                        "user_key": self.api_key,
                    },
                )
                if response.status_code == 429:
                    raise RateLimitError("Crunchbase API rate limit exceeded")
                response.raise_for_status()
                payload = response.json().get("properties") or response.json()
            categories = payload.get("categories") or []
            locations = payload.get("location_identifiers") or []
            return {
                "name": (payload.get("identifier") or {}).get("value") or payload.get("name"),
                "domain": domain,
                "description": payload.get("short_description"),
                "website_url": payload.get("website_url"),
                "industry": categories[0].get("value") if categories and isinstance(categories[0], dict) else None,
                "headcount": _headcount_midpoint(payload.get("num_employees_enum")),
                "funding_stage": payload.get("funding_stage"),
                "funding_amount_usd": _money_value(payload.get("funding_total")),
                "headquarters": locations[0].get("value") if locations and isinstance(locations[0], dict) else None,
                "linkedin_url": payload.get("linkedin", {}).get("value")
                if isinstance(payload.get("linkedin"), dict)
                else payload.get("linkedin"),
                "updated_at": payload.get("updated_at"),
            }

        uuid = await retry_async(autocomplete)
        if not uuid:
            return {}
        return await retry_async(lambda: entity(uuid))


def _money_value(value) -> int | None:
    if isinstance(value, dict):
        raw = value.get("value_usd") or value.get("value")
    else:
        raw = value
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _headcount_midpoint(value: str | None) -> int | None:
    if not value:
        return None
    digits = [int(part) for part in value.replace("_", "-").split("-") if part.isdigit()]
    if not digits:
        return None
    return sum(digits) // len(digits)
