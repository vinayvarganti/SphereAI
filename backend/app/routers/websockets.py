from __future__ import annotations

import asyncio
import json
from enum import Enum

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.core.config import get_settings
from app.core.security import verify_clerk_token
from app.memory.cache import get_redis_client


router = APIRouter(tags=["websockets"])


class WSEventType(str, Enum):
    AGENT_STARTED = "agent_started"
    AGENT_COMPLETED = "agent_completed"
    PROGRESS = "progress"
    RESULT = "result"
    ERROR = "error"
    APPROVAL_REQUIRED = "approval_required"
    WORKFLOW_COMPLETED = "workflow_completed"
    LOG = "log"


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, workflow_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(workflow_id, set()).add(websocket)

    def disconnect(self, workflow_id: str, websocket: WebSocket) -> None:
        self.active_connections.get(workflow_id, set()).discard(websocket)

    async def send_json(self, websocket: WebSocket, message: dict) -> None:
        await websocket.send_json(message)


manager = ConnectionManager()

_TERMINAL_EVENTS = frozenset({
    "approval_required",
    "workflow_completed",
    "error",
})


async def _authenticate_ws(token: str | None) -> bool:
    """
    Authenticate a WebSocket connection.

    Development mode : accept any token (or no token at all).
    Production mode  : token must be a valid signed JWT.
    """
    settings = get_settings()

    if settings.APP_ENV.lower() == "development":
        if token:
            try:
                await verify_clerk_token(token)
            except Exception:
                pass  # Bad token in dev is fine — we allow it anyway
        return True  # Always allow in development

    # Production — strict
    if not token:
        return False
    try:
        await verify_clerk_token(token)
        return True
    except Exception:
        return False


@router.websocket("/ws/{workflow_id}")
async def workflow_websocket(websocket: WebSocket, workflow_id: str) -> None:
    token = websocket.query_params.get("token")

    authenticated = await _authenticate_ws(token)
    if not authenticated:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    redis = get_redis_client()
    await manager.connect(workflow_id, websocket)
    pubsub = redis.pubsub()
    channel = f"workflow:{workflow_id}:events"

    try:
        # Replay any buffered events so the client catches up
        buffered = await redis.lrange(f"workflow:{workflow_id}:event_buffer", 0, -1)  # type: ignore[misc]
        already_terminal = False
        for raw in buffered:
            try:
                msg = json.loads(raw)
                await manager.send_json(websocket, msg)
                if msg.get("event") in _TERMINAL_EVENTS:
                    already_terminal = True
            except Exception:
                pass

        # If the workflow already finished, send a synthetic completed signal and close
        if already_terminal:
            try:
                await manager.send_json(websocket, {
                    "event": "workflow_completed",
                    "agent": "workflow_worker",
                    "message": "Workflow replay complete",
                })
            except Exception:
                pass
            return  # Close cleanly — no need to hang on pubsub

        await pubsub.subscribe(channel)

        while True:
            try:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
            except asyncio.CancelledError:
                # Server shutting down — exit the loop cleanly
                break
            except Exception:
                # Transient Redis error — wait and retry
                await asyncio.sleep(0.5)
                continue

            if message and message.get("data"):
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                try:
                    parsed = json.loads(data)
                    await manager.send_json(websocket, parsed)
                    # If this is a terminal event, close gracefully
                    if parsed.get("event") in _TERMINAL_EVENTS:
                        break
                except Exception:
                    # Client already disconnected
                    break

            await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        pass
    except asyncio.CancelledError:
        # Graceful server shutdown — suppress traceback
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(workflow_id, websocket)
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        except Exception:
            pass
