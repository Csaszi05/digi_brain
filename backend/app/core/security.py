from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings
import os
import base64

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
argon2_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


API_TOKEN_PREFIX = "dbk_"


def generate_api_token() -> str:
    """A new personal access token (shown once)."""
    import secrets
    return API_TOKEN_PREFIX + secrets.token_urlsafe(32)


def hash_api_token(token: str) -> str:
    """SHA-256 hex of an API token. Safe for high-entropy random tokens and
    fast to look up (unlike bcrypt, which can't be queried by value)."""
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_pending_2fa_token(user_id: str) -> str:
    """Short-lived (5 min) token issued after password check, exchanged for a
    real access token once the TOTP code is verified."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    return jwt.encode(
        {"sub": user_id, "purpose": "2fa", "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_pending_2fa_token(token: str) -> str | None:
    """Return the user_id if the token is a valid, unexpired 2FA-pending token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
    if payload.get("purpose") != "2fa":
        return None
    return payload.get("sub")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def derive_vault_key(master_password: str, salt: bytes) -> bytes:
    """Argon2id alapú kulcsderivál a Vault titkosításához."""
    import hashlib
    return hashlib.scrypt(
        master_password.encode(),
        salt=salt,
        n=2**17, r=8, p=1,
        dklен=32
    )


def encrypt_vault_value(plaintext: str, key: bytes) -> tuple[str, str]:
    """AES-256-GCM titkosítás. Visszaad: (encrypted_b64, iv_b64)"""
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext.encode(), None)
    return base64.b64encode(ciphertext).decode(), base64.b64encode(iv).decode()


def decrypt_vault_value(encrypted_b64: str, iv_b64: str, key: bytes) -> str:
    ciphertext = base64.b64decode(encrypted_b64)
    iv = base64.b64decode(iv_b64)
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ciphertext, None).decode()
