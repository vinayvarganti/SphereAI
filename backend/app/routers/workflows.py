import asyncio
import logging
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, Request, status

from app.agents.human_approval_agent import process_approval_decisions
from app.core.dependencies import get_current_user
from app.core.exceptions import AgentExecutionError
from app.core.security import UserContext
from app.memory.document_store import (
    create_workflow,
    delete_workflow,
    get_user_workflows,
    get_workflow_results,
    update_workflow_status,
)
from app.memory.vector_store import delete_workflow_vectors
from app.schemas.workflow import (
    ApprovalResponse,
    CreateWorkflowRequest,
    CreateWorkflowResponse,
    SubmitApprovalRequest,
    WorkflowDetailResponse,
    WorkflowListResponse,
    WorkflowResponse,
    WorkflowStatus,
)
from app.workers.workflow_worker import _run_workflow_async


logger = logging.getLogger("agentsphere.workflows")

router = APIRouter(prefix="/workflows", tags=["workflows"])


async def _run_workflow_background(
    workflow_id: str,
    workflow_config: dict,
    *,
    redis,
    db,
) -> None:
    """Run the workflow as a fire-and-forget asyncio background task."""
    try:
        await _run_workflow_async(workflow_id, workflow_config, redis=redis, db=db)
    except Exception as exc:
        logger.exception(
            "background_workflow_failed",
            extra={"workflow_id": workflow_id, "error": str(exc)},
        )


@router.post("", response_model=CreateWorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_and_start_workflow(
    payload: CreateWorkflowRequest,
    request: Request,
    user: UserContext = Depends(get_current_user),
) -> CreateWorkflowResponse:
    session_id = f"sess_{uuid4().hex}"
    workflow_doc = {
        "user_id": user.user_id,
        "session_id": session_id,
        "name": payload.name,
        "status": WorkflowStatus.PENDING.value,
        "icp": payload.icp.model_dump(),
        "personas": [persona.model_dump() for persona in payload.personas],
        "triggers": payload.triggers,
        "created_at": datetime.now(UTC),
    }
    workflow_id = await create_workflow(workflow_doc)
    workflow_config = {
        "workflow_id": workflow_id,
        "session_id": session_id,
        "user_id": user.user_id,
        "icp": payload.icp.model_dump(),
        "personas": [persona.model_dump() for persona in payload.personas],
        "triggers": payload.triggers,
    }
    try:
        await update_workflow_status(workflow_id, WorkflowStatus.RUNNING.value, user_id=user.user_id)
        # Run the workflow as an asyncio background task — no Celery worker needed
        asyncio.create_task(_run_workflow_background(
            workflow_id,
            workflow_config,
            redis=request.app.state.redis,
            db=request.app.state.db,
        ))
        logger.info("workflow_task_started", extra={"workflow_id": workflow_id})
    except Exception as exc:
        await update_workflow_status(workflow_id, WorkflowStatus.FAILED.value, user_id=user.user_id, error=str(exc))
        raise AgentExecutionError("Failed to dispatch workflow task", {"workflow_id": workflow_id}) from exc

    scheme = "wss" if request.url.scheme == "https" else "ws"
    websocket_url = f"{scheme}://{request.url.netloc}/api/v1/ws/{workflow_id}"
    return CreateWorkflowResponse(
        workflow_id=workflow_id,
        status=WorkflowStatus.RUNNING,
        websocket_url=websocket_url,
    )


@router.get("", response_model=WorkflowListResponse)
async def list_workflows(
    user: UserContext = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
) -> WorkflowListResponse:
    result = await get_user_workflows(user.user_id, page=page, per_page=per_page, status_filter=status)
    workflows = [
        WorkflowResponse(
            workflow_id=item["workflow_id"],
            name=item["name"],
            status=item["status"],
            results_count=item.get("results_count"),
            total_cost_usd=item.get("total_cost_usd"),
            created_at=item["created_at"],
            completed_at=item.get("completed_at"),
        )
        for item in result["workflows"]
        if item.get("workflow_id")  # guard against malformed docs
    ]
    return WorkflowListResponse(
        workflows=workflows,
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )


@router.get("/{workflow_id}", response_model=WorkflowDetailResponse)
async def get_workflow_detail(
    workflow_id: str,
    user: UserContext = Depends(get_current_user),
) -> WorkflowDetailResponse:
    results = await get_workflow_results(workflow_id, user_id=user.user_id)
    return WorkflowDetailResponse(**results)


@router.post("/{workflow_id}/approve", response_model=ApprovalResponse)
async def submit_approval(
    workflow_id: str,
    payload: SubmitApprovalRequest,
    user: UserContext = Depends(get_current_user),
) -> ApprovalResponse:
    processed = await process_approval_decisions(
        workflow_id,
        user.user_id,
        [decision.model_dump() for decision in payload.decisions],
    )
    return ApprovalResponse(workflow_id=workflow_id, status=WorkflowStatus.COMPLETED, processed=processed)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow_route(
    workflow_id: str,
    user: UserContext = Depends(get_current_user),
) -> None:
    await delete_workflow(workflow_id, user.user_id)
    await delete_workflow_vectors(workflow_id)
