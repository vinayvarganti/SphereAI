import hashlib
import re
from datetime import UTC, datetime
from urllib.parse import urlparse

from app.agents.common import emit_agent_completed, emit_agent_error, emit_agent_started, publish_workflow_event
from app.memory.cache import get_cached, set_cached
from app.services.serper_service import SerperService


TRIGGER_PATTERNS = {
    "funding_round": [r"\braises?\b", r"series\s+[a-d]", r"\bfunding\b", r"\$\d+(?:\.\d+)?\s?[mb]"],
    "headcount_growth": [r"\bhiring\b", r"expanding team", r"job board", r"headcount"],
    "new_executive": [r"\bappoints?\b", r"\bjoins as\b", r"\bcto\b", r"\bcro\b", r"\bvp\b"],
    "product_launch": [r"\blaunches\b", r"\bannounces\b", r"\breleases\b"],
    "expansion": [r"opens office", r"enters market", r"expands to", r"\bexpansion\b"],
}


class SearchAgent:
    name = "search_agent"

    def __init__(self, serper_service: SerperService | None = None):
        self.serper = serper_service or SerperService()

    async def run(self, state: dict) -> dict:
        await emit_agent_started(state, self.name)
        try:
            queries = self._queries_from_plan(state)
            signals: list[dict] = []
            for query in queries:
                query_hash = hashlib.sha256(query.encode("utf-8")).hexdigest()
                cache_key = f"cache:search:{query_hash}"
                cached = await get_cached(cache_key)
                rows = cached if isinstance(cached, list) else None
                if rows is None:
                    rows = []
                    for search_type in ("news", "search"):
                        rows.extend(await self.serper.search(query, search_type=search_type))
                    await set_cached(cache_key, rows, 86400)
                for row in rows:
                    signal = self._row_to_signal(row, state.get("triggers", []))
                    if not signal:
                        continue
                    signals.append(signal)
                    await publish_workflow_event(
                        state["workflow_id"],
                        state["user_id"],
                        "result",
                        self.name,
                        {"type": "signal", "data": signal},
                    )
            await emit_agent_completed(
                state,
                self.name,
                {"message": f"Search Agent found {len(signals)} raw company signals"},
            )
            return {
                "raw_signals": signals,
                "agent_logs": [
                    {"agent_name": self.name, "event_type": "signals_found", "output_summary": len(signals)}
                ],
            }
        except Exception as exc:
            await emit_agent_error(state, self.name, exc)
            raise

    def _queries_from_plan(self, state: dict) -> list[str]:
        plan = state.get("execution_plan") or {}
        if isinstance(plan, dict):
            raw_queries = plan.get("search_queries") or []
            if isinstance(raw_queries, dict):
                raw_queries = list(raw_queries.values())
            queries = [str(query) for query in raw_queries if str(query).strip()]
            if queries:
                return queries
        industries = state.get("icp", {}).get("industry") or ["B2B SaaS"]
        triggers = state.get("triggers") or ["funding_round"]
        return [f"{industry} {trigger.replace('_', ' ')} news" for industry in industries for trigger in triggers]

    def _row_to_signal(self, row: dict, triggers: list[str]) -> dict | None:
        text = f"{row.get('title', '')} {row.get('snippet', '')}"
        matched_trigger = self._detect_trigger(text, triggers)
        if not matched_trigger:
            return None
        title = row.get("title", "")
        company = self._extract_company_name(title) or self._extract_domain_company(row.get("link", ""))
        if not company:
            return None
        return {
            "company": company,
            # article_domain = the news site that reported this (e.g. thesaasnews.com)
            # company_domain = best-effort guess at the actual company's domain
            "article_domain": self._domain_from_url(row.get("link", "")),
            "domain": self._guess_company_domain(company),
            "signal": text.strip(),
            "source": row.get("source") or row.get("link") or "serper",
            "source_url": row.get("link"),
            "trigger_type": matched_trigger,
            "confidence": self._confidence(text, matched_trigger),
            "detected_at": datetime.now(UTC).isoformat(),
        }

    def _detect_trigger(self, text: str, triggers: list[str]) -> str | None:
        lower = text.lower()
        for trigger in triggers or TRIGGER_PATTERNS.keys():
            for pattern in TRIGGER_PATTERNS.get(trigger, []):
                if re.search(pattern, lower, flags=re.IGNORECASE):
                    return trigger
        return None

    def _confidence(self, text: str, trigger: str) -> float:
        matches = sum(1 for pattern in TRIGGER_PATTERNS.get(trigger, []) if re.search(pattern, text, re.IGNORECASE))
        return min(0.98, 0.65 + matches * 0.1)

    def _extract_company_name(self, title: str) -> str | None:
        separators = [" raises ", " announces ", " launches ", " appoints ", " expands ", " enters "]
        lower = title.lower()
        for separator in separators:
            if separator in lower:
                return title[: lower.index(separator)].strip(" -:|")
        if " - " in title:
            return title.split(" - ")[0].strip()
        return title.strip() or None

    def _domain_from_url(self, url: str) -> str | None:
        netloc = urlparse(url).netloc.lower()
        if not netloc:
            return None
        return netloc.removeprefix("www.")

    def _extract_domain_company(self, url: str) -> str | None:
        domain = self._domain_from_url(url)
        if not domain:
            return None
        return domain.split(".")[0].replace("-", " ").title()

    def _guess_company_domain(self, company_name: str) -> str | None:
        """Generate a best-effort company domain from the company name.
        
        e.g. "Mojro" -> "mojro.com", "Dreamdata" -> "dreamdata.com"
        """
        if not company_name:
            return None
        # Normalise: lowercase, remove non-alphanumeric except spaces/hyphens
        import re as _re
        slug = _re.sub(r"[^a-z0-9\s-]", "", company_name.lower()).strip()
        slug = _re.sub(r"[\s]+", "-", slug).strip("-")
        if not slug or len(slug) < 2:
            return None
        return f"{slug}.com"
