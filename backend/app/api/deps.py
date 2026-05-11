"""
Common API dependencies.

During development (before any user is registered) the app auto-seeds a dev user
via the lifespan hook in main.py.  Once real accounts exist, every request must
carry a valid Bearer JWT.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.security import decode_token

# The well-known dev-user UUID.  Only relevant for:
#   1. The lifespan seed (main.py) — ensures a working account exists locally.
#   2. The /auth/register endpoint — the very first registered user inherits
#      this ID so all dev-session data immediately becomes theirs.
DEV_USER_ID = "00000000-0000-0000-0000-000000000001"

_bearer = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """Extract and validate the JWT from the Authorization: Bearer header."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise ValueError("missing sub")
        return user_id
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
