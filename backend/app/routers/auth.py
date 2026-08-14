from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from jose import jwt

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.core.exceptions import UnauthorizedError
from app.core.security import UserContext, ALGORITHM

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory user store for dev (no database dependency)
# Maps email -> {id, name, email, password_hash}
_users: dict[str, dict] = {}


def _simple_hash(password: str) -> str:
    """Very lightweight hash for dev-only use."""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


def _create_jwt(user_id: str, email: str) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    claims = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(days=30),
    }
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=ALGORITHM)


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str
    email: str


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest) -> AuthResponse:
    if not payload.name.strip():
        raise UnauthorizedError("Full name is required")
    if len(payload.password) < 6:
        raise UnauthorizedError("Password must be at least 6 characters")

    email_key = payload.email.lower()
    if email_key in _users:
        raise UnauthorizedError("An account with this email already exists")

    import uuid
    user_id = str(uuid.uuid4())
    _users[email_key] = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email_key,
        "password_hash": _simple_hash(payload.password),
    }

    token = _create_jwt(user_id, email_key)
    return AuthResponse(token=token, user_id=user_id, name=payload.name.strip(), email=email_key)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    email_key = payload.email.lower()
    user = _users.get(email_key)

    if not user or user["password_hash"] != _simple_hash(payload.password):
        raise UnauthorizedError("Invalid email or password")

    token = _create_jwt(user["id"], email_key)
    return AuthResponse(token=token, user_id=user["id"], name=user["name"], email=email_key)


@router.get("/me")
async def read_current_user(user: UserContext = Depends(get_current_user)) -> UserContext:
    return user
