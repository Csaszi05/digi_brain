"""Login + consent page for the OAuth flow.

The SDK redirects the browser here (see provider.authorize). We authenticate the
user against the DigiBrain backend login — so 2FA applies — and on success mint a
one-time auth code and redirect back to the OAuth client (Claude).
"""

from __future__ import annotations

import html

import httpx
from mcp.server.auth.provider import construct_redirect_uri
from starlette.requests import Request
from starlette.responses import HTMLResponse, RedirectResponse

from ..config import load_config
from . import store
from .provider import mint_authorization_code


def _page(pending_id: str, message: str = "") -> str:
    msg = f'<p style="color:#dc2626;font-size:13px">{html.escape(message)}</p>' if message else ""
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DigiBrain — Connect</title></head>
<body style="font-family:system-ui,sans-serif;background:#0b0b10;color:#e5e7eb;
display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
<form method="post" action="/oauth/consent"
 style="background:#16161d;border:1px solid #2a2a35;border-radius:12px;padding:28px;width:320px">
  <h2 style="margin:0 0 4px">DigiBrain</h2>
  <p style="color:#9ca3af;font-size:13px;margin:0 0 16px">
    Allow Claude to access your DigiBrain?
  </p>
  {msg}
  <input type="hidden" name="pending" value="{html.escape(pending_id)}">
  <label style="font-size:12px;color:#9ca3af">Email</label>
  <input name="email" type="email" required autofocus
   style="width:100%;box-sizing:border-box;margin:4px 0 12px;padding:9px;border-radius:7px;
   border:1px solid #2a2a35;background:#0b0b10;color:#e5e7eb">
  <label style="font-size:12px;color:#9ca3af">Password</label>
  <input name="password" type="password" required
   style="width:100%;box-sizing:border-box;margin:4px 0 12px;padding:9px;border-radius:7px;
   border:1px solid #2a2a35;background:#0b0b10;color:#e5e7eb">
  <label style="font-size:12px;color:#9ca3af">2FA code (if enabled)</label>
  <input name="code" type="text" inputmode="numeric" autocomplete="one-time-code"
   style="width:100%;box-sizing:border-box;margin:4px 0 16px;padding:9px;border-radius:7px;
   border:1px solid #2a2a35;background:#0b0b10;color:#e5e7eb">
  <button type="submit"
   style="width:100%;padding:10px;border:0;border-radius:7px;background:#6366f1;color:#fff;
   font-weight:600;cursor:pointer">Allow</button>
</form></body></html>"""


async def consent_get(request: Request) -> HTMLResponse:
    pending_id = request.query_params.get("pending", "")
    if not pending_id or store.get_pending(pending_id) is None:
        return HTMLResponse("<h3>Invalid or expired request.</h3>", status_code=400)
    return HTMLResponse(_page(pending_id))


async def consent_post(request: Request):
    form = await request.form()
    pending_id = str(form.get("pending", ""))
    pending = store.get_pending(pending_id)
    if pending is None:
        return HTMLResponse("<h3>Request expired — start again.</h3>", status_code=400)

    email = str(form.get("email", "")).strip()
    password = str(form.get("password", ""))
    code = str(form.get("code", "")).strip()
    api = load_config().api_url

    subject = await _verify_login(api, email, password, code)
    if subject is None:
        return HTMLResponse(_page(pending_id, "Invalid credentials or 2FA code."), status_code=401)

    store.del_pending(pending_id)
    auth_code, redirect_uri, state = mint_authorization_code(pending, subject)
    return RedirectResponse(
        construct_redirect_uri(redirect_uri, code=auth_code, state=state),
        status_code=302,
    )


async def _verify_login(api: str, email: str, password: str, code: str) -> str | None:
    """Return the user id if email/password (+2FA) are valid, else None."""
    if not email or not password:
        return None
    async with httpx.AsyncClient(base_url=api, timeout=30) as c:
        r = await c.post("/auth/login", json={"email": email, "password": password})
        if r.status_code != 200:
            return None
        data = r.json()
        if data.get("requires_2fa"):
            if not code:
                return None
            r2 = await c.post("/auth/login/2fa", json={"pending_token": data["pending_token"], "code": code})
            if r2.status_code != 200:
                return None
            return r2.json()["user"]["id"]
        user = data.get("user")
        return user["id"] if user else None


def register_oauth_routes(mcp) -> None:
    """Mount the consent routes on the FastMCP app."""
    mcp.custom_route("/oauth/consent", methods=["GET"])(consent_get)
    mcp.custom_route("/oauth/consent", methods=["POST"])(consent_post)
