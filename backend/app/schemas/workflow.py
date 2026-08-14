from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ICPConfig(BaseModel):
    industry: list[str]
    headcount_min: int = Field(ge=1)
    headcount_max: int = Field(ge=1)
    funding_stages: list[str]
    geography: list[str]
    revenue_min_usd: int | None = Field(default=None, ge=0)
    tech_stack: list[str] | None = None

    @field_validator("headcount_max")
    @classmethod
    def max_greater_than_min(cls, value: int, info):
        minimum = info.data.get("headcount_min")
        if minimum is not None and value < minimum:
            raise ValueError("headcount_max must be greater than or equal to headcount_min")
        return value


class PersonaConfig(BaseModel):
    name: str
    titles: list[str]
    seniority_levels: list[str] | None = None
    priority: int = Field(default=1, ge=1)


class CreateWorkflowRequest(BaseModel):
    name: str
    icp: ICPConfig
    personas: list[PersonaConfig]
    triggers: list[str]


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"


class WorkflowResponse(BaseModel):
    workflow_id: str
    name: str
    status: WorkflowStatus
    results_count: int | None = None
    total_cost_usd: float | None = None
    created_at: datetime
    completed_at: datetime | None = None


class CreateWorkflowResponse(BaseModel):
    workflow_id: str
    status: WorkflowStatus
    websocket_url: str
    estimated_duration_seconds: int = 240


class WorkflowListResponse(BaseModel):
    workflows: list[WorkflowResponse]
    total: int
    page: int
    per_page: int


class ApprovalDecision(BaseModel):
    contact_id: str
    action: Literal["approve", "reject", "edit"]
    reason: str | None = None
    edits: dict | None = None


class SubmitApprovalRequest(BaseModel):
    decisions: list[ApprovalDecision]


class ApprovalResponse(BaseModel):
    workflow_id: str
    status: WorkflowStatus
    processed: int


class WorkflowDetailResponse(BaseModel):
    workflow: dict
    companies: list[dict]
    contacts: list[dict]
    summary_report: dict | list | None = None
    logs: list[dict]

    @field_validator("summary_report", mode="before")
    @classmethod
    def normalise_summary_report(cls, v):
        """Ensure summary_report is always a dict (or None).

        Older workflow runs may have stored the report as a bare list of
        company-summary dicts. Wrap those into the canonical shape that the
        frontend SummaryReport component expects.
        """
        if v is None:
            return None
        if isinstance(v, list):
            return {"companies": v}
        return v
