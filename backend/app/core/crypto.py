"""
Symmetric encryption for sensitive fields (email passwords, OAuth tokens).
Uses Fernet (AES-128-CBC + HMAC-SHA256) from the cryptography package.

Setup: generate a key once with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
Then set FERNET_KEY=<output> in your .env file.
"""

from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings


def _fernet() -> Fernet:
    key = settings.FERNET_KEY
    if not key:
        # Dev fallback: deterministic key derived from JWT_SECRET.
        # Never use in production — rotate to a real FERNET_KEY env var.
        import base64, hashlib
        raw = hashlib.sha256(settings.JWT_SECRET.encode()).digest()
        key = base64.urlsafe_b64encode(raw).decode()
    return Fernet(key.encode())


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Could not decrypt credential — wrong key?") from exc
