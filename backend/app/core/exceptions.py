from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class AgentSphereError(Exception):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "agentsphere_error"

    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)


class WorkflowNotFoundError(AgentSphereError):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "workflow_not_found"


class UnauthorizedError(AgentSphereError):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "unauthorized"


class InvalidICPError(AgentSphereError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "invalid_icp"


class AgentExecutionError(AgentSphereError):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "agent_execution_error"


class RateLimitError(AgentSphereError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "rate_limited"


class DuplicateWorkflowError(AgentSphereError):
    status_code = status.HTTP_409_CONFLICT
    error_code = "duplicate_workflow"


class ExternalServiceNotConfiguredError(AgentSphereError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "external_service_not_configured"


async def agentsphere_exception_handler(_: Request, exc: AgentSphereError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_code, "message": exc.message, "details": exc.details},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AgentSphereError, agentsphere_exception_handler)
