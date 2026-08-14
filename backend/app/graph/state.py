import operator
from typing import Annotated, Optional, TypedDict


class AgentState(TypedDict):
    session_id: str
    workflow_id: str
    user_id: str
    icp: dict
    personas: list[dict]
    triggers: list[str]
    execution_plan: Optional[dict | list[str]]

    raw_signals: Annotated[list[dict], operator.add]
    discovered_companies: Annotated[list[dict], operator.add]
    validated_companies: Annotated[list[dict], operator.add]
    decision_makers: Annotated[list[dict], operator.add]
    enriched_contacts: Annotated[list[dict], operator.add]
    summary_report: Optional[dict]
    approval_status: Optional[str]

    agent_logs: Annotated[list[dict], operator.add]
    total_tokens: int
    total_cost_usd: float
    errors: Annotated[list[str], operator.add]
