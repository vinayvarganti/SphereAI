from datetime import datetime

from pydantic import BaseModel, Field


class Contact(BaseModel):
    id: str | None = None
    company_id: str | None = None
    workflow_id: str
    user_id: str
    name: str
    title: str | None = None
    seniority: str | None = None
    department: str | None = None
    email: str | None = None
    email_confidence: float | None = Field(default=None, ge=0, le=1)
    phone: str | None = None
    linkedin_url: str | None = None
    persona_matched: str | None = None
    approval_status: str = "pending"
    outreach_recommendation: str | None = None
    created_at: datetime | None = None
