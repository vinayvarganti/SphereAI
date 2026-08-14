from app.schemas.workflow import CreateWorkflowRequest


def test_workflow_schema_accepts_required_request():
    request = CreateWorkflowRequest(
        name="SaaS Funding Discovery",
        icp={
            "industry": ["B2B SaaS"],
            "headcount_min": 50,
            "headcount_max": 500,
            "funding_stages": ["Series B"],
            "geography": ["United States"],
        },
        personas=[{"name": "Economic Buyer", "titles": ["VP Sales"], "priority": 1}],
        triggers=["funding_round"],
    )
    assert request.icp.headcount_max == 500
