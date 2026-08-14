from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.core.exceptions import WorkflowNotFoundError
from app.core.security import UserContext
from app.memory.document_store import get_agent_logs
from app.schemas.agent import AgentListResponse, AgentLogResponse, AgentMetadata, AgentPatchRequest, AgentStatus


router = APIRouter(prefix="/agents", tags=["agents"])


AGENT_REGISTRY: dict[str, AgentMetadata] = {
    "planner_agent": AgentMetadata(
        agent_id="planner_agent",
        name="Planner Agent",
        description="Creates the workflow execution plan using Gemini / Ollama and memory context",
        avg_latency_ms=1200,
        avg_cost_per_run_usd=0.025,
        required_api_keys=["GEMINI_API_KEY"],
    ),
    "search_agent": AgentMetadata(
        agent_id="search_agent",
        name="Search Agent",
        description="Monitors web sources for funding, hiring, product, executive, and expansion triggers",
        avg_latency_ms=1800,
        avg_cost_per_run_usd=0.012,
        required_api_keys=["SERPER_API_KEY"],
    ),
    "company_discovery_agent": AgentMetadata(
        agent_id="company_discovery_agent",
        name="Company Discovery Agent",
        description="Enriches firmographics and scores companies against ICP criteria",
        avg_latency_ms=1600,
        avg_cost_per_run_usd=0.01,
        required_api_keys=[],
    ),
    "validation_agent": AgentMetadata(
        agent_id="validation_agent",
        name="Validation Agent",
        description="Validates domains, confidence, freshness, persistence, and vector deduplication",
        avg_latency_ms=900,
        avg_cost_per_run_usd=0.004,
        required_api_keys=[],
    ),
    "decision_maker_agent": AgentMetadata(
        agent_id="decision_maker_agent",
        name="Decision Maker Agent",
        description="Finds persona-matched decision makers and ranks by seniority",
        avg_latency_ms=1300,
        avg_cost_per_run_usd=0.008,
        required_api_keys=["SERPER_API_KEY"],
    ),
    "contact_enrichment_agent": AgentMetadata(
        agent_id="contact_enrichment_agent",
        name="Contact Enrichment Agent",
        description="Finds emails, phones, and verified LinkedIn URLs",
        avg_latency_ms=2200,
        avg_cost_per_run_usd=0.02,
        required_api_keys=["HUNTER_API_KEY"],
    ),
    "summary_agent": AgentMetadata(
        agent_id="summary_agent",
        name="Summary Agent",
        description="Generates structured actionable sales intelligence summaries using Gemini / Ollama",
        avg_latency_ms=1400,
        avg_cost_per_run_usd=0.03,
        required_api_keys=["GEMINI_API_KEY"],
    ),
    "human_approval_agent": AgentMetadata(
        agent_id="human_approval_agent",
        name="Human Approval Agent",
        description="Pauses workflow for approval, edit, or rejection decisions",
        avg_latency_ms=200,
        avg_cost_per_run_usd=0,
        required_api_keys=[],
    ),
}


@router.get("", response_model=AgentListResponse)
async def list_agents(user: UserContext = Depends(get_current_user)) -> AgentListResponse:
    return AgentListResponse(agents=list(AGENT_REGISTRY.values()))


@router.get("/{agent_id}", response_model=AgentMetadata)
async def get_agent(agent_id: str, user: UserContext = Depends(get_current_user)) -> AgentMetadata:
    agent = AGENT_REGISTRY.get(agent_id)
    if not agent:
        raise WorkflowNotFoundError(f"Agent {agent_id} was not found")
    return agent


@router.get("/{agent_id}/logs", response_model=AgentLogResponse)
async def get_logs(
    agent_id: str,
    user: UserContext = Depends(get_current_user),
    workflow_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AgentLogResponse:
    result = await get_agent_logs(
        user_id=user.user_id,
        agent_id=agent_id,
        workflow_id=workflow_id,
        limit=limit,
        offset=offset,
    )
    return AgentLogResponse(**result)


@router.patch("/{agent_id}", response_model=AgentMetadata)
async def patch_agent(
    agent_id: str,
    payload: AgentPatchRequest,
    user: UserContext = Depends(get_current_user),
) -> AgentMetadata:
    agent = AGENT_REGISTRY.get(agent_id)
    if not agent:
        raise WorkflowNotFoundError(f"Agent {agent_id} was not found")
    updated = agent.model_copy(update={"status": AgentStatus.ACTIVE if payload.enabled else AgentStatus.DISABLED})
    AGENT_REGISTRY[agent_id] = updated
    return updated
