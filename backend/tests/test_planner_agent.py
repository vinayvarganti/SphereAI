import pytest

import app.agents.planner_agent as planner_module
from app.agents.planner_agent import PlannerAgent


class FakeMessage:
    content = '{"agents":["search"],"parallel_groups":[["search"]],"search_queries":["Series B SaaS"],"icp_scoring_weights":{"industry_match":0.25},"token_budget_per_agent":{"search":1000}}'
    response_metadata = {"token_usage": {"prompt_tokens": 10, "completion_tokens": 20}}


class FakeLLM:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    async def ainvoke(self, prompt):
        return FakeMessage()


@pytest.mark.asyncio
async def test_planner_agent_uses_gpt_and_returns_plan(monkeypatch, fake_redis):
    settings = planner_module.get_settings()
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(planner_module, "get_llm", lambda *args, **kwargs: FakeLLM())

    state = {
        "session_id": "sess_1",
        "workflow_id": "wf_1",
        "user_id": "user_test",
        "icp": {"industry": ["B2B SaaS"]},
        "personas": [],
        "triggers": ["funding_round"],
        "total_tokens": 0,
        "total_cost_usd": 0.0,
    }
    result = await PlannerAgent().run(state)
    assert result["execution_plan"]["search_queries"] == ["Series B SaaS"]
    assert result["total_tokens"] == 30
