"""DigiBrain OAuth 2.1 authorization-server provider.

Implements the MCP SDK's OAuthAuthorizationServerProvider protocol. The SDK
serves the actual HTTP endpoints (metadata, /authorize, /token, /register,
/revoke) and verifies PKCE; this class supplies storage and token issuance.
The user login + consent happens on our own /oauth/consent page (see consent.py),
which calls mint_authorization_code() once the user is verified.
"""

from __future__ import annotations

import os
import secrets
import time

from mcp.server.auth.provider import (
    AccessToken,
    AuthorizationCode,
    AuthorizationParams,
    OAuthAuthorizationServerProvider,
    RefreshToken,
)
from mcp.shared.auth import OAuthClientInformationFull, OAuthToken

from . import store

PUBLIC_URL = os.environ.get("MCP_PUBLIC_URL", "http://localhost:8002").rstrip("/")
ACCESS_TTL = 3600                 # 1 hour
REFRESH_TTL = 60 * 60 * 24 * 30   # 30 days
CODE_TTL = 600                    # 10 minutes


class DigiBrainOAuthProvider(OAuthAuthorizationServerProvider):
    # ── clients (Dynamic Client Registration) ──
    async def get_client(self, client_id: str) -> OAuthClientInformationFull | None:
        d = store.get_client(client_id)
        return OAuthClientInformationFull.model_validate(d) if d else None

    async def register_client(self, client_info: OAuthClientInformationFull) -> None:
        store.put_client(client_info.client_id, client_info.model_dump(mode="json"))

    # ── authorize: hand off to our login/consent page ──
    async def authorize(self, client: OAuthClientInformationFull, params: AuthorizationParams) -> str:
        pending_id = secrets.token_urlsafe(16)
        store.put_pending(pending_id, {
            "client_id": client.client_id,
            "redirect_uri": str(params.redirect_uri),
            "redirect_uri_provided_explicitly": params.redirect_uri_provided_explicitly,
            "code_challenge": params.code_challenge,
            "state": params.state,
            "scopes": params.scopes or [],
            "resource": params.resource,
        })
        return f"{PUBLIC_URL}/oauth/consent?pending={pending_id}"

    # ── authorization codes ──
    async def load_authorization_code(
        self, client: OAuthClientInformationFull, authorization_code: str
    ) -> AuthorizationCode | None:
        d = store.get_code(authorization_code)
        if not d or d["client_id"] != client.client_id or d["expires_at"] < time.time():
            return None
        return AuthorizationCode(**d)

    async def exchange_authorization_code(
        self, client: OAuthClientInformationFull, authorization_code: AuthorizationCode
    ) -> OAuthToken:
        store.del_code(authorization_code.code)  # one-time use
        return self._issue(client.client_id, list(authorization_code.scopes), authorization_code.subject)

    # ── refresh tokens ──
    async def load_refresh_token(
        self, client: OAuthClientInformationFull, refresh_token: str
    ) -> RefreshToken | None:
        d = store.get_refresh(refresh_token)
        if not d or d["client_id"] != client.client_id or d["expires_at"] < time.time():
            return None
        return RefreshToken(**d)

    async def exchange_refresh_token(
        self, client: OAuthClientInformationFull, refresh_token: RefreshToken, scopes: list[str]
    ) -> OAuthToken:
        store.del_refresh(refresh_token.token)  # rotate
        return self._issue(client.client_id, scopes or list(refresh_token.scopes), refresh_token.subject)

    # ── access tokens ──
    async def load_access_token(self, token: str) -> AccessToken | None:
        d = store.get_access(token)
        if not d:
            return None
        if d["expires_at"] < time.time():
            store.del_access(token)
            return None
        return AccessToken(**d)

    async def revoke_token(self, token) -> None:
        tok = getattr(token, "token", token)
        store.del_access(tok)
        store.del_refresh(tok)

    # ── helpers ──
    def _issue(self, client_id: str, scopes: list[str], subject: str | None) -> OAuthToken:
        now = int(time.time())
        access = secrets.token_urlsafe(32)
        refresh = secrets.token_urlsafe(32)
        store.put_access(access, {
            "token": access, "client_id": client_id, "scopes": scopes,
            "expires_at": now + ACCESS_TTL, "resource": None, "subject": subject, "claims": None,
        })
        store.put_refresh(refresh, {
            "token": refresh, "client_id": client_id, "scopes": scopes,
            "expires_at": now + REFRESH_TTL, "subject": subject,
        })
        return OAuthToken(
            access_token=access,
            token_type="Bearer",
            expires_in=ACCESS_TTL,
            scope=" ".join(scopes) if scopes else None,
            refresh_token=refresh,
        )


def mint_authorization_code(pending: dict, subject: str) -> tuple[str, str, str | None]:
    """Called by the consent page after the user is verified. Creates a one-time
    auth code bound to the pending request. Returns (code, redirect_uri, state)."""
    code = secrets.token_urlsafe(24)
    store.put_code(code, {
        "code": code,
        "scopes": pending["scopes"],
        "expires_at": int(time.time()) + CODE_TTL,
        "client_id": pending["client_id"],
        "code_challenge": pending["code_challenge"],
        "redirect_uri": pending["redirect_uri"],
        "redirect_uri_provided_explicitly": pending["redirect_uri_provided_explicitly"],
        "resource": pending.get("resource"),
        "subject": subject,
    })
    return code, pending["redirect_uri"], pending.get("state")
