from app.agents.common import emit_agent_completed, emit_agent_error, emit_agent_started, publish_workflow_event
from app.memory.document_store import update_contact_approval, update_workflow_status


class HumanApprovalAgent:
    name = "human_approval_agent"

    async def run(self, state: dict) -> dict:
        await emit_agent_started(state, self.name)
        try:
            await update_workflow_status(
                state["workflow_id"],
                "awaiting_approval",
                user_id=state["user_id"],
                summary_report=state.get("summary_report"),
                results_count=len(state.get("enriched_contacts", [])),
                total_cost_usd=state.get("total_cost_usd", 0.0),
                total_tokens=state.get("total_tokens", 0),
            )
            await publish_workflow_event(
                state["workflow_id"],
                state["user_id"],
                "approval_required",
                self.name,
                {
                    "contacts": state.get("enriched_contacts", []),
                    "summary_report": state.get("summary_report"),
                },
            )
            await emit_agent_completed(
                state,
                self.name,
                {"message": "Workflow paused for human approval"},
            )
            return {
                "approval_status": "pending",
                "agent_logs": [{"agent_name": self.name, "event_type": "approval_required"}],
            }
        except Exception as exc:
            await emit_agent_error(state, self.name, exc)
            raise


async def process_approval_decisions(workflow_id: str, user_id: str, decisions: list[dict]) -> int:
    processed = 0
    for decision in decisions:
        action = decision.get("action")
        status = {"approve": "approved", "reject": "rejected", "edit": "approved"}.get(action, action)
        await update_contact_approval(
            contact_id=decision["contact_id"],
            workflow_id=workflow_id,
            user_id=user_id,
            approval_status=status,
            reason=decision.get("reason"),
            edits=decision.get("edits"),
        )
        processed += 1
    await update_workflow_status(workflow_id, "completed", user_id=user_id)
    await publish_workflow_event(
        workflow_id,
        user_id,
        "workflow_completed",
        "human_approval_agent",
        {"summary": {"approved_decisions_processed": processed}},
    )
    return processed
