from app.agents.company_discovery_agent import CompanyDiscoveryAgent


def test_company_discovery_icp_scoring_formula():
    agent = CompanyDiscoveryAgent()
    company = {
        "industry": "B2B SaaS",
        "headcount": 150,
        "funding_stage": "Series B",
        "headquarters": "United States",
        "revenue_estimate_usd": 10_000_000,
        "tech_stack": ["Salesforce"],
    }
    icp = {
        "industry": ["B2B SaaS"],
        "headcount_min": 50,
        "headcount_max": 500,
        "funding_stages": ["Series B"],
        "geography": ["United States"],
        "revenue_min_usd": 5_000_000,
        "tech_stack": ["Salesforce"],
    }
    score, matched = agent.score_company(company, icp)
    assert score == 1.0
    assert matched == ["industry", "headcount", "funding_stage", "geography", "revenue", "tech_stack"]
