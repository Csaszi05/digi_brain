"""TOTP (time-based one-time password) helpers for two-factor auth.

The per-user secret is stored Fernet-encrypted (see app.core.crypto); these
helpers work with the *decrypted* secret. Backup codes are one-time recovery
codes, stored hashed (bcrypt) just like passwords.
"""

import base64
import io
import secrets

import pyotp
import qrcode

from app.core.security import hash_password, verify_password

ISSUER = "DigiBrain"
BACKUP_CODE_COUNT = 10


def generate_secret() -> str:
    """A fresh base32 TOTP secret to show (as QR) during enrollment."""
    return pyotp.random_base32()


def otpauth_uri(secret: str, account: str) -> str:
    """The otpauth:// URI an authenticator app reads from the QR code."""
    return pyotp.totp.TOTP(secret).provisioning_uri(name=account, issuer_name=ISSUER)


def qr_data_url(otpauth: str) -> str:
    """Render the otpauth URI as a base64 PNG data URL for the frontend to show."""
    img = qrcode.make(otpauth)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


def verify_code(secret: str, code: str) -> bool:
    """Check a 6-digit code, tolerating ±30s clock drift."""
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code.strip().replace(" ", ""), valid_window=1)


def generate_backup_codes(n: int = BACKUP_CODE_COUNT) -> list[str]:
    """Plaintext one-time recovery codes (shown once to the user)."""
    return [f"{secrets.randbelow(10**8):08d}" for _ in range(n)]


def hash_backup_codes(codes: list[str]) -> list[str]:
    return [hash_password(c) for c in codes]


def consume_backup_code(code: str, hashed: list[str] | None) -> list[str] | None:
    """If `code` matches an unused backup code, return the remaining hashes
    (with that one removed). Otherwise return None."""
    if not hashed:
        return None
    cleaned = code.strip().replace(" ", "").replace("-", "")
    for i, h in enumerate(hashed):
        if verify_password(cleaned, h):
            return hashed[:i] + hashed[i + 1:]
    return None
