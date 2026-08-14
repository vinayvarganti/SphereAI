from datetime import UTC, datetime, timedelta

import httpx

from app.agents.common import emit_agent_completed, emit_agent_error, emit_agent_started, publish_workflow_event
from app.memory.document_store import save_company
from app.memory.vector_store import store_company_embedding


class ValidationAgent:
    name = "validation_agent"

    async def run(self, state: dict) -> dict:
        await emit_agent_started(state, self.name)
        validated: list[dict] = []
        try:
            for index, company in enumerate(state.get("discovered_companies", []), start=1):
                domain_active = await self._domain_active(company.get("domain"))
                recency_weight = self._recency_weight(company.get("updated_at"))
                sources_agreed = 1 + int(bool(company.get("source_signal"))) + int(bool(company.get("linkedin_url")))
                total_sources = 3
                confidence = round((sources_agreed / total_sources) * recency_weight * company.get("icp_match_score", 0), 4)
                status = "validated" if domain_active and confidence >= 0.30 else "partial" if domain_active else "unverified"
                company = {**company, "validation_status": status, "confidence_score": confidence}
                company_id = await save_company(company)
                company["id"] = company_id
                await store_company_embedding(company)
                validated.append(company)
                await publish_workflow_event(
                    state["workflow_id"],
                    state["user_id"],
                    "progress",
                    self.name,
                    {"completed": index, "total": len(state.get("discovered_companies", []))},
                )
            await emit_agent_completed(
                state,
                self.name,
                {"message": f"Validation Agent stored {len(validated)} companies"},
            )
            return {
                "validated_companies": validated,
                "agent_logs": [{"agent_name": self.name, "event_type": "companies_validated", "output_summary": len(validated)}],
            }
        except Exception as exc:
            await emit_agent_error(state, self.name, exc)
            raise

    async def _domain_active(self, domain: str | None) -> bool:
        if not domain:
            return False
        url = domain if domain.startswith(("http://", "https://")) else f"https://{domain}"
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                response = await client.head(url)
                if response.status_code >= 400:
                    response = await client.get(url)
            return response.status_code < 500
        except httpx.HTTPError:
            return False

    def _recency_weight(self, updated_at) -> float:
        if not updated_at:
            return 0.85
        if isinstance(updated_at, str):
            clean = updated_at.replace("Z", "+00:00")
            try:
                updated_at = datetime.fromisoformat(clean)
            except ValueError:
                return 0.85
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=UTC)
        return 1.0 if datetime.now(UTC) - updated_at <= timedelta(days=90) else 0.7
