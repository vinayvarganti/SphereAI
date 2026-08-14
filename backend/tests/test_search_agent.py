import pytest

from app.agents.search_agent import SearchAgent


class FakeSerper:
    async def search(self, query, search_type="news"):
        return [
            {
                "title": "Acme Corp raises $25M Series B",
                "snippet": "B2B SaaS company Acme Corp announces new funding.",
                "link": "https://example.com/acme",
                "source": "Example News",
            }
        ]


@pytest.mark.asyncio
async def test_search_agent_detects_funding_signal(fake_redis):
    state = {
        "workflow_id": "wf_1",
        "user_id": "user_test",
        "execution_plan": {"search_queries": ["B2B SaaS Series B funding"]},
        "triggers": ["funding_round"],
    }
    result = await SearchAgent(FakeSerper()).run(state)
    assert result["raw_signals"][0]["trigger_type"] == "funding_round"
    assert result["raw_signals"][0]["company"] == "Acme Corp"
