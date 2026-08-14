from datetime import datetime

from pydantic import BaseModel, Field


class Headquarters(BaseModel):
    city: str | None = None
    state: str | None = None
    country: str | None = None


class CompanySignal(BaseModel):
    company: str
    source: str | None = None
    trigger_type: str
    signal: str
    confidence: float = Field(ge=0, le=1)
    detected_at: datetime


class Company(BaseModel):
    id: str | None = None
    workflow_id: str
    user_id: str
    name: str
    domain: str | None = None
    industry: str | None = None
    headcount: int | None = Field(default=None, ge=0)
    funding_stage: str | None = None
    funding_amount_usd: int | None = Field(default=None, ge=0)
    revenue_estimate_usd: int | None = Field(default=None, ge=0)
    headquarters: Headquarters | dict | str | None = None
    linkedin_url: str | None = None
    crunchbase_url: str | None = None
    icp_match_score: float = Field(default=0, ge=0, le=1)
    validation_status: str | None = None
    triggers_matched: list[str] = Field(default_factory=list)
    tech_stack: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
