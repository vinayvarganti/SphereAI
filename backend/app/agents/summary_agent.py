import json
from datetime import UTC, datetime

from app.agents.common import (
    emit_agent_completed,
    emit_agent_error,
    emit_agent_started,
    parse_json_object,
    token_usage_from_message,
    get_llm,
)
from app.core.config import get_settings


SUMMARY_SYSTEM_PROMPT = """You are a B2B sales intelligence analyst. Generate an actionable prospect summary for the sales team.

Company Data: {company_data}
Decision Makers: {contacts}
ICP Match Score: {icp_score}
Business Triggers: {triggers_matched}
Confidence Score: {confidence}

For each company, provide:
1. executive_summary: 3-sentence overview
2. why_now: Why this company is a HOT prospect right now (reference the specific trigger)
3. outreach_strategy: Recommended approach for each decision maker persona
4. subject_lines: 3 personalized email subject lines (reference the trigger)
5. risk_factors: 2-3 potential objections to anticipate
6. recommended_actions: Ordered list of next steps

Output ONLY valid JSON.
"""


class SummaryAgent:
    name = "summary_agent"

    async def run(self, state: dict) -> dict:
        await emit_agent_started(state, self.name)
        settings = get_settings()
        company_data = state.get("validated_companies", [])
        contacts = state.get("enriched_contacts", [])
        average_icp = self._average(company.get("icp_match_score", 0) for company in company_data)
        average_confidence = self._average(company.get("confidence_score", 0) for company in company_data)
        triggers = sorted({trigger for company in company_data for trigger in company.get("triggers_matched", []) if trigger})
        prompt = SUMMARY_SYSTEM_PROMPT.format(
            company_data=json.dumps(company_data, default=str),
            contacts=json.dumps(contacts, default=str),
            icp_score=average_icp,
            triggers_matched=triggers,
            confidence=average_confidence,
        )
        prompt_tokens = 0
        completion_tokens = 0
        cost = 0.0
        try:
            llm = get_llm(settings, temperature=0.2)
            if llm and company_data:
                try:
                    message = await llm.ainvoke(prompt)
                    raw = parse_json_object(str(message.content))
                    report = self._normalise_report(raw)
                    prompt_tokens, completion_tokens, cost = token_usage_from_message(
                        message, prompt, provider="gemini" if settings.GEMINI_API_KEY else "ollama"
                    )
                except Exception as exc:
                    import logging
                    logging.getLogger("agentsphere.agents").warning(
                        f"SummaryAgent LLM invocation failed ({exc}); falling back to deterministic report"
                    )
                    report = self._fallback_report(company_data, contacts)
            else:
                report = self._fallback_report(company_data, contacts)
            await emit_agent_completed(
                state,
                self.name,
                {
                    "message": "Summary Agent generated report",
                    "tokens_used": prompt_tokens + completion_tokens,
                    "cost_usd": cost,
                },
            )
            return {
                "summary_report": report,
                "agent_logs": [
                    {
                        "agent_name": self.name,
                        "event_type": "summary_created",
                        "tokens_used": prompt_tokens + completion_tokens,
                        "cost_usd": cost,
                    }
                ],
                "total_tokens": state.get("total_tokens", 0) + prompt_tokens + completion_tokens,
                "total_cost_usd": round(state.get("total_cost_usd", 0.0) + cost, 8),
            }
        except Exception as exc:
            await emit_agent_error(state, self.name, exc)
            raise

    def _fallback_report(self, companies: list[dict], contacts: list[dict]) -> dict:
        companies_report = []
        for company in companies:
            company_contacts = [contact for contact in contacts if contact.get("company_id") == company.get("id")]
            trigger = ", ".join(company.get("triggers_matched", [])) or "recent market activity"
            companies_report.append(
                {
                    "company_id": company.get("id"),
                    "company_name": company.get("name"),
                    "executive_summary": (
                        f"{company.get('name')} matches the configured ICP with a score of "
                        f"{company.get('icp_match_score', 0)}. The company is associated with {trigger}. "
                        "Prioritize persona-specific outreach once contacts are approved."
                    ),
                    "why_now": f"The active trigger context is {trigger}.",
                    "outreach_strategy": {
                        contact.get("persona_matched") or "general": f"Reference {trigger} and the likely growth priorities."
                        for contact in company_contacts
                    },
                    "subject_lines": [
                        f"{company.get('name')} and your next growth stage",
                        f"Quick idea after {trigger}",
                        f"Supporting {company.get('name')} as demand scales",
                    ],
                    "risk_factors": ["Contact data may require manual verification", "Budget timing may vary by team"],
                    "recommended_actions": ["Approve qualified contacts", "Verify emails", "Launch trigger-aware outreach"],
                    "confidence_score": company.get("confidence_score", 0),
                }
            )
        return {"companies": companies_report, "contacts_pending_approval": len(contacts), "generated_at": datetime.now(UTC).isoformat()}

    def _average(self, values) -> float:
        numbers = [float(value) for value in values if value is not None]
        return round(sum(numbers) / len(numbers), 4) if numbers else 0.0

    def _normalise_report(self, raw) -> dict:
        """Ensure the LLM report is always a canonical dict.

        The LLM sometimes returns:
          - A bare list of company-summary objects
          - A dict with "companies" key (correct)
          - A dict with some other wrapper key

        We normalise all of these into {"companies": [...], "generated_at": "..."}.
        """
        from datetime import UTC, datetime
        generated_at = datetime.now(UTC).isoformat()

        if isinstance(raw, list):
            return {"companies": raw, "generated_at": generated_at}
        if isinstance(raw, dict):
            if "companies" in raw:
                raw.setdefault("generated_at", generated_at)
                return raw
            # Try common wrapper keys the LLM might use
            for key in ("results", "report", "data", "summaries"):
                if key in raw and isinstance(raw[key], list):
                    return {"companies": raw[key], "generated_at": generated_at}
            # Fallback: treat the entire dict as a single company summary
            return {"companies": [raw], "generated_at": generated_at}
        # Unknown format — return empty
        return {"companies": [], "generated_at": generated_at}
