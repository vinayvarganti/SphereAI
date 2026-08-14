from app.agents.company_discovery_agent import CompanyDiscoveryAgent
from app.agents.contact_enrichment_agent import ContactEnrichmentAgent
from app.agents.decision_maker_agent import DecisionMakerAgent
from app.agents.human_approval_agent import HumanApprovalAgent
from app.agents.planner_agent import PlannerAgent
from app.agents.search_agent import SearchAgent
from app.agents.summary_agent import SummaryAgent
from app.agents.validation_agent import ValidationAgent
from app.graph.state import AgentState


async def planner_node(state: AgentState) -> dict:
    return await PlannerAgent().run(dict(state))


async def search_node(state: AgentState) -> dict:
    return await SearchAgent().run(dict(state))


async def company_discovery_node(state: AgentState) -> dict:
    return await CompanyDiscoveryAgent().run(dict(state))


async def validation_node(state: AgentState) -> dict:
    return await ValidationAgent().run(dict(state))


async def decision_maker_node(state: AgentState) -> dict:
    return await DecisionMakerAgent().run(dict(state))


async def enrichment_node(state: AgentState) -> dict:
    return await ContactEnrichmentAgent().run(dict(state))


async def summary_node(state: AgentState) -> dict:
    return await SummaryAgent().run(dict(state))


async def approval_node(state: AgentState) -> dict:
    return await HumanApprovalAgent().run(dict(state))
