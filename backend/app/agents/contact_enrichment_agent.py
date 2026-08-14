import asyncio
import hashlib

from app.agents.common import emit_agent_completed, emit_agent_error, emit_agent_started, publish_workflow_event
from app.memory.cache import get_cached, set_cached
from app.memory.document_store import save_contact
from app.services.apollo_service import ApolloService
from app.services.hunter_service import HunterService

# News / aggregator domains — don't bother enriching contacts from these
_SKIP_DOMAINS = frozenset({
    "thesaasnews.com", "saasrise.com", "news.crunchbase.com", "crunchbase.com",
    "techinasia.com", "inc42.com", "thenextweb.com", "tech.eu", "osborneclarke.com",
    "ycombinator.com", "highalpha.com", "team4.agency", "b2b.economictimes.indiatimes.com",
    "reddit.com", "x.com", "twitter.com", "youtube.com", "medium.com",
    "techcrunch.com", "reuters.com", "bloomberg.com", "forbes.com",
})

# Maximum number of contacts to enrich per workflow run (to prevent multi-minute hangs)
MAX_CONTACTS_TO_ENRICH = 10


class ContactEnrichmentAgent:
    name = "contact_enrichment_agent"

    def __init__(self, hunter_service: HunterService | None = None, apollo_service: ApolloService | None = None):
        self.hunter = hunter_service or HunterService()
        self.apollo = apollo_service or ApolloService()

    async def run(self, state: dict) -> dict:
        await emit_agent_started(state, self.name)
        enriched: list[dict] = []
        try:
            all_decision_makers = state.get("decision_makers", [])

            # Filter out contacts from news/media sites before enrichment
            valid_decision_makers = [
                dm for dm in all_decision_makers
                if dm.get("domain") not in _SKIP_DOMAINS
                and not any(skip in (dm.get("domain") or "") for skip in ["news", "crunchbase", "reddit", "thesaas"])
            ]

            # Cap at MAX_CONTACTS_TO_ENRICH to prevent run-away API calls
            decision_makers_to_enrich = valid_decision_makers[:MAX_CONTACTS_TO_ENRICH]

            await publish_workflow_event(
                state["workflow_id"],
                state["user_id"],
                "progress",
                self.name,
                {"message": f"Enriching {len(decision_makers_to_enrich)} contacts (capped at {MAX_CONTACTS_TO_ENRICH})"},
            )

            for decision_maker in decision_makers_to_enrich:
                try:
                    contact = await self._enrich_one(decision_maker)
                    contact_id = await save_contact(contact)
                    contact["id"] = contact_id
                    enriched.append(contact)
                    await publish_workflow_event(
                        state["workflow_id"],
                        state["user_id"],
                        "result",
                        self.name,
                        {"type": "contact", "data": contact},
                    )
                except Exception as exc:
                    # Don't abort the whole batch for one failed contact
                    import logging
                    logging.getLogger("agentsphere.agents").warning(
                        f"ContactEnrichmentAgent: skipping contact {decision_maker.get('name')} due to error: {exc}"
                    )

            await emit_agent_completed(
                state,
                self.name,
                {"message": f"Contact Enrichment Agent enriched {len(enriched)} contacts"},
            )
            return {
                "enriched_contacts": enriched,
                "agent_logs": [{"agent_name": self.name, "event_type": "contacts_enriched", "output_summary": len(enriched)}],
            }
        except Exception as exc:
            await emit_agent_error(state, self.name, exc)
            raise

    async def _enrich_one(self, decision_maker: dict) -> dict:
        """Enrich a single contact with a per-request timeout so Hunter doesn't hang."""
        name_hash = hashlib.sha256(str(decision_maker.get("name", "")).encode("utf-8")).hexdigest()
        cache_key = f"cache:contact:{decision_maker.get('domain')}:{name_hash}"
        cached = await get_cached(cache_key)
        if isinstance(cached, dict):
            return {**decision_maker, **cached, "approval_status": "pending"}

        first, last = self._split_name(decision_maker.get("name", ""))

        # Wrap Hunter call in a 12-second timeout to avoid blocking the whole pipeline
        try:
            email = await asyncio.wait_for(
                self.hunter.find_email(decision_maker.get("domain"), first, last),
                timeout=12.0,
            )
        except asyncio.TimeoutError:
            email = {"email": None, "confidence": 0}

        # Apollo is fast (or no-ops without API key) — no special timeout needed
        apollo = await self.apollo.find_contact(
            decision_maker.get("name", ""),
            decision_maker.get("company", ""),
            decision_maker.get("linkedin_url"),
        )

        contact = {
            **decision_maker,
            "email": email.get("email") or apollo.get("email"),
            "email_confidence": email.get("confidence"),
            "phone": apollo.get("phone"),
            "linkedin_url": apollo.get("linkedin_url") or decision_maker.get("linkedin_url"),
            "employment_history": apollo.get("employment_history", []),
            "approval_status": "pending",
        }
        await set_cached(
            cache_key,
            {
                "email": contact.get("email"),
                "email_confidence": contact.get("email_confidence"),
                "phone": contact.get("phone"),
                "linkedin_url": contact.get("linkedin_url"),
                "employment_history": contact.get("employment_history", []),
            },
            43200,
        )
        return contact

    def _split_name(self, name: str) -> tuple[str, str]:
        parts = [part for part in name.strip().split(" ") if part]
        if not parts:
            return "", ""
        if len(parts) == 1:
            return parts[0], ""
        return parts[0], parts[-1]
