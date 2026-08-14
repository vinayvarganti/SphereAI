def test_workflow_crud_and_approval(client, monkeypatch):
    import app.routers.workflows as workflow_router

    monkeypatch.setattr(workflow_router.run_workflow_task, "delay", lambda *args, **kwargs: None)

    payload = {
        "name": "SaaS Funding Discovery",
        "icp": {
            "industry": ["B2B SaaS"],
            "headcount_min": 50,
            "headcount_max": 500,
            "funding_stages": ["Series A", "Series B"],
            "geography": ["United States"],
        },
        "personas": [{"name": "Economic Buyer", "titles": ["VP Sales", "CRO"], "priority": 1}],
        "triggers": ["funding_round"],
    }
    response = client.post("/api/v1/workflows", json=payload)
    assert response.status_code == 201
    workflow_id = response.json()["workflow_id"]

    response = client.get("/api/v1/workflows")
    assert response.status_code == 200
    assert response.json()["total"] == 1

    response = client.get(f"/api/v1/workflows/{workflow_id}")
    assert response.status_code == 200
    assert response.json()["workflow"]["workflow_id"] == workflow_id

    response = client.delete(f"/api/v1/workflows/{workflow_id}")
    assert response.status_code == 204
