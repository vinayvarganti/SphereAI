from app.routers.agents import AGENT_REGISTRY


def test_agent_registry_contains_required_agents():
    expected = {
        "planner_agent",
        "search_agent",
        "company_discovery_agent",
        "validation_agent",
        "decision_maker_agent",
        "contact_enrichment_agent",
        "summary_agent",
        "human_approval_agent",
    }
    assert expected.issubset(set(AGENT_REGISTRY))
