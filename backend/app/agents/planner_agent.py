from app.agents.common import (
    emit_agent_completed,
    emit_agent_error,
    emit_agent_started,
    parse_json_object,
    token_usage_from_message,
    get_llm,
)
from app.core.config import get_settings
from app.memory.cache import get_session_context


PLANNER_SYSTEM_PROMPT = """You are an AI Planner Agent for a B2B customer discovery platform.
Your job is to create an optimal agent execution plan based on the user's ICP and business triggers.

Given:
- ICP Configuration: {icp}
- Target Personas: {personas}
- Business Triggers to Monitor: {triggers}
- Existing Memory Context: {memory_context}

Return a JSON execution plan with:
1. List of agents to activate (in order)
2. Parallel execution groups (agents that can run simultaneously)
3. Search queries to use for each trigger
4. ICP scoring weights for qualification
5. Estimated token budget per agent

Output ONLY valid JSON. No explanation text.
"""


class PlannerAgent:
    name = "planner_agent"

    async def run(self, state: dict) -> dict:
        await emit_agent_started(state, self.name)
        settings = get_settings()
        memory_context = await get_session_context(state["session_id"]) or {}
        prompt = PLANNER_SYSTEM_PROMPT.format(
            icp=state["icp"],
            personas=state["personas"],
            triggers=state["triggers"],
            memory_context=memory_context,
        )
        prompt_tokens = 0
        completion_tokens = 0
        cost = 0.0
        try:
            llm = get_llm(settings, temperature=0)
            if llm:
                try:
                    message = await llm.ainvoke(prompt)
                    plan = parse_json_object(str(message.content))
                    prompt_tokens, completion_tokens, cost = token_usage_from_message(
                        message, prompt, provider="gemini" if settings.GEMINI_API_KEY else "ollama"
                    )
                except Exception as exc:
                    import logging
                    logging.getLogger("agentsphere.agents").warning(
                        f"PlannerAgent LLM invocation failed ({exc}); falling back to deterministic plan"
                    )
                    plan = self._fallback_plan(state)
            else:
                plan = self._fallback_plan(state)
            await emit_agent_completed(
                state,
                self.name,
                {
                    "message": "Planner produced execution plan",
                    "tokens_used": prompt_tokens + completion_tokens,
                    "cost_usd": cost,
                },
            )
            return {
                "execution_plan": plan,
                "agent_logs": [
                    {
                        "agent_name": self.name,
                        "event_type": "plan_created",
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

    def _fallback_plan(self, state: dict) -> dict:
        industries = state.get("icp", {}).get("industry") or ["B2B SaaS"]
        search_queries = [
            f'{industry} {" ".join(state.get("triggers", []))} company news'
            for industry in industries
        ]
        return {
            "agents": [
                "search",
                "company_discovery",
                "validation",
                "decision_maker",
                "enrichment",
                "summary",
                "approval",
            ],
            "parallel_groups": [["search"], ["company_discovery", "validation"], ["decision_maker", "enrichment"]],
            "search_queries": search_queries,
            "icp_scoring_weights": {
                "industry_match": 0.25,
                "headcount_match": 0.20,
                "funding_stage_match": 0.20,
                "geography_match": 0.15,
                "revenue_match": 0.10,
                "tech_stack_match": 0.10,
            },
            "token_budget_per_agent": {
                "planner": 1500,
                "search": 1000,
                "company_discovery": 1000,
                "validation": 800,
                "decision_maker": 800,
                "enrichment": 600,
                "summary": 2000,
            },
        }
