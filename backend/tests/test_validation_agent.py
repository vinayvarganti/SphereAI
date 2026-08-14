import pytest

import app.agents.validation_agent as validation_module
from app.agents.validation_agent import ValidationAgent


@pytest.mark.asyncio
async def test_validation_agent_saves_validated_company(monkeypatch):
    saved = {}

    async def fake_save_company(company):
        saved.update(company)
        return "co_1"

    async def fake_store_company_embedding(company):
        return "co_1"

    async def fake_domain_active(self, domain):
        return True

    monkeypatch.setattr(validation_module, "save_company", fake_save_company)
    monkeypatch.setattr(validation_module, "store_company_embedding", fake_store_company_embedding)
    monkeypatch.setattr(ValidationAgent, "_domain_active", fake_domain_active)

    state = {
        "workflow_id": "wf_1",
        "user_id": "user_test",
        "discovered_companies": [
            {
                "name": "Acme",
                "domain": "acme.com",
                "icp_match_score": 0.9,
                "source_signal": {"trigger_type": "funding_round"},
                "linkedin_url": "x",
            }
        ],
    }
    result = await ValidationAgent().run(state)
    assert result["validated_companies"][0]["validation_status"] == "validated"
    assert saved["name"] == "Acme"
