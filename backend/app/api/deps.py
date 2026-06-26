"""
Common API dependencies.

Authentication accepts either:
  - a Bearer JWT (issued by /auth/login or /auth/login/2fa), or
  - a personal access token (prefix "dbk_") for programmatic clients such as the
    MCP server — these bypass interactive 2FA and are looked up by SHA-256 hash.
"""

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import API_TOKEN_PREFIX, decode_token, hash_api_token
from app.models.api_token import ApiToken

DEV_USER_ID = "00000000-0000-0000-0000-000000000001"

_bearer = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> str:
    """Validate the Authorization: Bearer header (JWT or API token)."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # ── personal access token (machine clients, e.g. MCP) ──
    if token.startswith(API_TOKEN_PREFIX):
        row = await db.execute(
            select(ApiToken).where(ApiToken.token_hash == hash_api_token(token))
        )
        api_token = row.scalar_one_or_none()
        if api_token is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Throttled last-used update (avoid a write on every request).
        now = datetime.now(timezone.utc)
        if api_token.last_used_at is None or (now - api_token.last_used_at) > timedelta(hours=1):
            api_token.last_used_at = now
            await db.commit()
        return api_token.user_id

    # ── normal JWT ──
    try:
        payload = decode_token(token)
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
