from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError

ALGORITHM = "HS256"


class UserContext(BaseModel):
    user_id: str
    email: str | None = None
    roles: list[str] = Field(default_factory=list)


def _extract_roles(claims: dict[str, Any]) -> list[str]:
    candidates = [
        claims.get("roles"),
        claims.get("metadata", {}).get("roles") if isinstance(claims.get("metadata"), dict) else None,
    ]
    roles: list[str] = []
    for candidate in candidates:
        if isinstance(candidate, list):
            roles.extend(str(role) for role in candidate)
        elif isinstance(candidate, str):
            roles.append(candidate)
    return sorted(set(roles))


async def verify_clerk_token(token: str) -> UserContext:
    """
    Verify a locally-signed JWT token (HS256) using the app SECRET_KEY.
    Replaces the previous Clerk JWKS-based verification.
    """
    settings = get_settings()
    try:
        claims = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise UnauthorizedError("JWT verification failed") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise UnauthorizedError("JWT is missing subject claim")

    email = claims.get("email")
    roles = _extract_roles(claims)

    return UserContext(user_id=user_id, email=email, roles=roles)


def authorization_header_to_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Use Authorization: Bearer <token>")
    return token
