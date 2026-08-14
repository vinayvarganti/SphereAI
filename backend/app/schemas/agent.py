from enum import Enum

from pydantic import BaseModel, Field


class AgentStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"


class AgentMetadata(BaseModel):
    agent_id: str
    name: str
    description: str
    status: AgentStatus = AgentStatus.ACTIVE
    avg_latency_ms: int = 0
    avg_cost_per_run_usd: float = 0
    required_api_keys: list[str] = Field(default_factory=list)


class AgentListResponse(BaseModel):
    agents: list[AgentMetadata]


class AgentPatchRequest(BaseModel):
    enabled: bool


class AgentLogResponse(BaseModel):
    logs: list[dict]
    total: int
