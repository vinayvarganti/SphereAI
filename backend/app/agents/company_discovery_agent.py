from urllib.parse import urlparse

from app.agents.common import emit_agent_completed, emit_agent_error, emit_agent_started, publish_workflow_event
from app.memory.cache import acquire_lock, release_lock
from app.memory.vector_store import check_duplicate
from app.services.crunchbase_service import CrunchbaseService


class CompanyDiscoveryAgent:
    name = "company_discovery_agent"

    def __init__(self, crunchbase_service: CrunchbaseService | None = None):
        self.crunchbase = crunchbase_service or CrunchbaseService()

    async def run(self, state: dict) -> dict:
        await emit_agent_started(state, self.name)
        discovered: list[dict] = []
        icp = state.get("icp", {})
        # Read threshold from ICP config — default to 0.35 to allow companies through when Crunchbase is unavailable
        score_threshold = float(icp.get("min_icp_score") or 0.35)
        try:
            for signal in state.get("raw_signals", []):
                company_name = signal.get("company", "")
                guessed_domain = signal.get("domain")  # best-effort domain from SearchAgent
                lock_key = f"lock:company:{company_name.lower().replace(' ', '_')}"
                if not await acquire_lock(lock_key, timeout_seconds=30):
                    continue
                try:
                    # Look up by company NAME (not article domain) — Crunchbase autocomplete works better with names
                    details = await self.crunchbase.get_company(company_name) if company_name else {}
                    company = self._merge_signal_and_details(signal, details, state, guessed_domain)
                    score, matched = self.score_company(company, icp)
                    company["icp_match_score"] = score
                    company["icp_criteria_matched"] = matched
                    if score < score_threshold:
                        continue
                    domain = company.get("domain") or guessed_domain
                    if domain and await check_duplicate(domain):
                        continue
                    discovered.append(company)
                    await publish_workflow_event(
                        state["workflow_id"],
                        state["user_id"],
                        "result",
                        self.name,
                        {"type": "company", "data": company},
                    )
                finally:
                    await release_lock(lock_key)
            await emit_agent_completed(
                state,
                self.name,
                {"message": f"Company Discovery qualified {len(discovered)} companies"},
            )
            return {
                "discovered_companies": discovered,
                "agent_logs": [
                    {"agent_name": self.name, "event_type": "companies_qualified", "output_summary": len(discovered)}
                ],
            }
        except Exception as exc:
            await emit_agent_error(state, self.name, exc)
            raise

    def _merge_signal_and_details(self, signal: dict, details: dict, state: dict, guessed_domain: str | None = None) -> dict:
        # Prefer Crunchbase website_url (the company's real site) over guessed domain
        crunchbase_website = details.get("website_url") or ""
        real_domain = self._domain_from_url(crunchbase_website) if crunchbase_website else None
        domain = real_domain or guessed_domain or signal.get("domain")
        icp = state.get("icp", {})
        # Infer industry from signal text if Crunchbase didn't return one
        inferred_industry = details.get("industry") or self._infer_industry_from_signal(signal, icp)
        # Use ICP funding stage default if Crunchbase returned nothing
        inferred_funding = details.get("funding_stage") or self._first(icp.get("funding_stages"))
        # Use ICP geography default if Crunchbase returned nothing
        inferred_geo = details.get("headquarters") or self._first(icp.get("geography"))
        return {
            "workflow_id": state["workflow_id"],
            "user_id": state["user_id"],
            "name": details.get("name") or signal.get("company"),
            "domain": domain,
            "industry": inferred_industry,
            "headcount": details.get("headcount"),
            "funding_stage": inferred_funding,
            "funding_amount_usd": details.get("funding_amount_usd"),
            "revenue_estimate_usd": details.get("revenue_estimate_usd"),
            "headquarters": inferred_geo,
            "linkedin_url": details.get("linkedin_url"),
            "crunchbase_url": details.get("crunchbase_url"),
            "tech_stack": details.get("tech_stack") or [],
            "triggers_matched": [signal.get("trigger_type")] if signal.get("trigger_type") else [],
            "source_signal": signal,
            "description": details.get("description") or signal.get("signal"),
            "updated_at": details.get("updated_at"),
        }

    def _infer_industry_from_signal(self, signal: dict, icp: dict) -> str | None:
        """Try to infer industry from the signal text matching ICP industries."""
        text = f"{signal.get('signal', '')} {signal.get('company', '')}".lower()
        for industry in icp.get("industry", []):
            if industry.lower() in text:
                return industry
        # Return first ICP industry as best-effort fallback
        return self._first(icp.get("industry"))

    def score_company(self, company: dict, icp: dict) -> tuple[float, list[str]]:
        """Score a company against the ICP.

        When external enrichment data is missing (headcount/funding/revenue are None),
        we treat those dimensions as *neutral* (0.5) rather than disqualifying (0.0),
        because the absence of data is not evidence of a bad fit.
        """
        industry_match = self._contains_any(company.get("industry"), icp.get("industry", []))
        headcount_match = self._headcount_match(company.get("headcount"), icp)
        funding_stage_match = self._funding_stage_match(company.get("funding_stage"), icp.get("funding_stages", []))
        geography_match = self._geography_match(company.get("headquarters"), icp.get("geography", []))
        revenue_match = self._revenue_match(company.get("revenue_estimate_usd"), icp.get("revenue_min_usd"))
        tech_stack_match = self._tech_stack_match(company.get("tech_stack", []), icp.get("tech_stack"))

        score = (
            industry_match * 0.30
            + headcount_match * 0.20
            + funding_stage_match * 0.20
            + geography_match * 0.15
            + revenue_match * 0.10
            + tech_stack_match * 0.05
        )
        matched = [
            name
            for name, value in [
                ("industry", industry_match),
                ("headcount", headcount_match),
                ("funding_stage", funding_stage_match),
                ("geography", geography_match),
                ("revenue", revenue_match),
                ("tech_stack", tech_stack_match),
            ]
            if value > 0
        ]
        return round(score, 4), matched

    def _contains_any(self, value, allowed: list[str]) -> float:
        if not allowed:
            return 1.0
        if value is None:
            # Missing data — neutral score, not a disqualifier
            return 0.5
        haystack = str(value).lower()
        return 1.0 if any(str(item).lower() in haystack or haystack in str(item).lower() for item in allowed) else 0.3

    def _headcount_match(self, value, icp: dict) -> float:
        if value is None:
            # No headcount data from Crunchbase — neutral, not disqualifying
            return 0.5
        minimum = icp.get("headcount_min", 0)
        maximum = icp.get("headcount_max", 10**12)
        return 1.0 if minimum <= int(value) <= maximum else 0.2

    def _funding_stage_match(self, value, allowed: list[str]) -> float:
        if not allowed:
            return 1.0
        if value is None:
            # No funding stage from Crunchbase — neutral
            return 0.5
        haystack = str(value).lower()
        return 1.0 if any(str(item).lower() in haystack or haystack in str(item).lower() for item in allowed) else 0.3

    def _geography_match(self, value, allowed: list[str]) -> float:
        """Geo matching with common aliases (US, USA, United States, America)."""
        if not allowed:
            return 1.0
        if value is None:
            return 0.5
        # Expand common aliases
        geo_aliases: dict[str, list[str]] = {
            "united states": ["usa", "us", "america", "united states of america", "u.s.", "u.s.a."],
            "uk": ["united kingdom", "england", "great britain", "britain"],
            "india": ["in", "bharat"],
        }
        haystack = str(value).lower()
        for icp_geo in allowed:
            icp_lower = icp_geo.lower()
            # Direct substring match
            if icp_lower in haystack or haystack in icp_lower:
                return 1.0
            # Alias check
            aliases = geo_aliases.get(icp_lower, [])
            if any(alias in haystack for alias in aliases):
                return 1.0
            # Also check reverse aliases
            for canonical, alias_list in geo_aliases.items():
                if icp_lower in alias_list and (canonical in haystack or any(a in haystack for a in alias_list)):
                    return 1.0
        return 0.3

    def _revenue_match(self, value, minimum) -> float:
        if minimum is None or minimum == 0:
            return 1.0
        if value is None:
            # No revenue data — neutral
            return 0.5
        # revenue_min_usd from frontend is stored in $M — convert to dollars
        min_dollars = int(minimum) * 1_000_000 if int(minimum) < 10_000 else int(minimum)
        return 1.0 if int(value) >= min_dollars else 0.3

    def _tech_stack_match(self, value: list[str], allowed: list[str] | None) -> float:
        if not allowed:
            return 1.0
        if not value:
            # No tech stack data — neutral
            return 0.5
        values = {str(item).lower() for item in value or []}
        return 1.0 if any(str(item).lower() in values for item in allowed) else 0.3

    def _first(self, values):
        return values[0] if isinstance(values, list) and values else None

    def _domain_from_url(self, url: str) -> str | None:
        netloc = urlparse(url).netloc.lower()
        return netloc.removeprefix("www.") if netloc else None
