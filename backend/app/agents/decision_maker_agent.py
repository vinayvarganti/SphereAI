from app.agents.common import emit_agent_completed, emit_agent_error, emit_agent_started, publish_workflow_event
from app.tools.linkedin_tool import LinkedInTool, _NEWS_DOMAINS


SENIORITY_RANK = {
    "c-suite": 5,
    "vp": 4,
    "director": 3,
    "manager": 2,
    "individual contributor": 1,
}


class DecisionMakerAgent:
    name = "decision_maker_agent"

    def __init__(self, linkedin_tool: LinkedInTool | None = None):
        self.linkedin = linkedin_tool or LinkedInTool()

    async def run(self, state: dict) -> dict:
        await emit_agent_started(state, self.name)
        decision_makers: list[dict] = []
        try:
            for company in state.get("validated_companies", []):
                # Skip media/news/aggregator sites — they're not target companies
                domain = company.get("domain", "")
                if domain in _NEWS_DOMAINS or any(nd in domain for nd in [
                    "news", "techcrunch", "crunchbase", "reddit", "medium",
                    "twitter", "youtube", "facebook", "saasrise", "thesaasnews",
                ]):
                    continue
                candidates: list[dict] = []
                for persona in state.get("personas", []):
                    people = await self.linkedin.search_people(company.get("name", ""), persona.get("titles", []))
                    for person in people:
                        title = person.get("title", "")
                        if not self._matches_persona(title, persona):
                            continue
                        seniority = self._seniority(title)
                        candidates.append(
                            {
                                "workflow_id": state["workflow_id"],
                                "user_id": state["user_id"],
                                "company_id": company.get("id"),
                                "company": company.get("name"),
                                "domain": company.get("domain"),
                                "name": person.get("name"),
                                "title": title,
                                "seniority": seniority,
                                "department": self._department(title),
                                "linkedin_url": person.get("linkedin_url"),
                                "persona_matched": persona.get("name"),
                                "persona_priority": persona.get("priority", 1),
                            }
                        )
                ranked = sorted(
                    candidates,
                    key=lambda item: (-SENIORITY_RANK.get(item.get("seniority", ""), 0), item.get("persona_priority", 1)),
                )[:3]
                decision_makers.extend(ranked)
                for contact in ranked:
                    await publish_workflow_event(
                        state["workflow_id"],
                        state["user_id"],
                        "result",
                        self.name,
                        {"type": "decision_maker", "data": contact},
                    )
            await emit_agent_completed(
                state,
                self.name,
                {"message": f"Decision Maker Agent found {len(decision_makers)} contacts"},
            )
            return {
                "decision_makers": decision_makers,
                "agent_logs": [
                    {"agent_name": self.name, "event_type": "decision_makers_found", "output_summary": len(decision_makers)}
                ],
            }
        except Exception as exc:
            await emit_agent_error(state, self.name, exc)
            raise

    def _matches_persona(self, title: str, persona: dict) -> bool:
        lower = title.lower()
        # Check explicit title patterns
        if any(pattern.lower() in lower for pattern in persona.get("titles", [])):
            return True
        # Fallback: accept based on seniority levels
        seniority_levels = [s.lower() for s in (persona.get("seniority_levels") or [])]
        if seniority_levels:
            detected = self._seniority(title)
            if detected in (s.replace("-", " ") for s in seniority_levels) or detected in seniority_levels:
                return True
        return False

    def _seniority(self, title: str) -> str:
        lower = title.lower()
        if any(term in lower for term in ["chief", "ceo", "cto", "cro", "cfo", "coo", "cmo"]):
            return "c-suite"
        if "vp" in lower or "vice president" in lower:
            return "vp"
        if "director" in lower:
            return "director"
        if "manager" in lower or "lead" in lower:
            return "manager"
        return "individual contributor"

    def _department(self, title: str) -> str:
        lower = title.lower()
        if any(term in lower for term in ["sales", "revenue", "growth"]):
            return "sales"
        if any(term in lower for term in ["engineering", "technology", "platform", "product"]):
            return "engineering"
        if "marketing" in lower:
            return "marketing"
        return "general"
