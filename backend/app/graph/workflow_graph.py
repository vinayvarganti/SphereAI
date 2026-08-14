from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    approval_node,
    company_discovery_node,
    decision_maker_node,
    enrichment_node,
    planner_node,
    search_node,
    summary_node,
    validation_node,
)
from app.graph.state import AgentState


def build_workflow_graph():
    graph = StateGraph(AgentState)

    graph.add_node("planner", planner_node)
    graph.add_node("search", search_node)
    graph.add_node("company_discovery", company_discovery_node)
    graph.add_node("validation", validation_node)
    graph.add_node("decision_maker", decision_maker_node)
    graph.add_node("enrichment", enrichment_node)
    graph.add_node("summary", summary_node)
    graph.add_node("approval", approval_node)

    graph.set_entry_point("planner")

    graph.add_edge("planner", "search")
    graph.add_edge("search", "company_discovery")
    graph.add_edge("company_discovery", "validation")
    graph.add_edge("validation", "decision_maker")
    graph.add_edge("decision_maker", "enrichment")
    graph.add_edge("enrichment", "summary")
    graph.add_edge("summary", "approval")
    graph.add_edge("approval", END)

    return graph.compile()
