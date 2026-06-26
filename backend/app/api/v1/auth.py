from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DEV_USER_ID, get_current_user_id
from app.core.crypto import decrypt, encrypt
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_pending_2fa_token,
    decode_pending_2fa_token,
    hash_password,
    verify_password,
)
from app.core import totp
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    TokenResponse,
    TwoFADisableRequest,
    TwoFAEnableRequest,
    TwoFAEnableResponse,
    TwoFALoginRequest,
    TwoFASetupResponse,
    TwoFAStatusResponse,
    UpdateProfileRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    existing = (
        await db.execute(select(User).where(User.email == payload.email))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # First-user-inherits: if no users exist yet, use the DEV_USER_ID so all
    # existing (dev-session) data is immediately owned by the first real account.
    user_count = (await db.execute(select(func.count()).select_from(User))).scalar()
    new_id = DEV_USER_ID if user_count == 0 else None

    user = User(
        id=new_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    if new_id:
        user.id = new_id
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email),
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user = (
        await db.execute(select(User).where(User.email == payload.email))
    ).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # If 2FA is on, the password alone is NOT enough: hand back a short-lived
    # pending token; the client must call /auth/login/2fa with a code.
    if user.totp_enabled:
        return LoginResponse(
            requires_2fa=True,
            pending_token=create_pending_2fa_token(user.id),
        )

    return LoginResponse(
        access_token=create_access_token({"sub": user.id}),
        user=UserResponse(id=user.id, email=user.email),
    )


@router.post("/login/2fa", response_model=TokenResponse)
async def login_2fa(
    payload: TwoFALoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user_id = decode_pending_2fa_token(payload.pending_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="2FA session expired — please log in again",
        )
    user = await db.get(User, user_id)
    if user is None or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="2FA not active")

    secret = decrypt(user.totp_secret)
    if totp.verify_code(secret, payload.code):
        pass  # valid authenticator code
    else:
        # Fall back to a one-time backup code; if used, remove it.
        remaining = totp.consume_backup_code(payload.code, user.totp_backup_codes)
        if remaining is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code"
            )
        user.totp_backup_codes = remaining
        await db.commit()

    return TokenResponse(
        access_token=create_access_token({"sub": user.id}),
        user=UserResponse(id=user.id, email=user.email),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(id=user.id, email=user.email)


@router.patch("/me", response_model=TokenResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Change email and/or password. Always requires the current password."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    if payload.new_email and payload.new_email != user.email:
        conflict = (
            await db.execute(select(User).where(User.email == payload.new_email))
        ).scalar_one_or_none()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already taken by another account",
            )
        user.email = payload.new_email

    if payload.new_password:
        user.password_hash = hash_password(payload.new_password)

    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email),
    )


# ─── Two-factor auth (TOTP) ───────────────────────────────

@router.get("/2fa/status", response_model=TwoFAStatusResponse)
async def twofa_status(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return TwoFAStatusResponse(enabled=user.totp_enabled)


@router.post("/2fa/setup", response_model=TwoFASetupResponse)
async def twofa_setup(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Begin enrollment: generate a secret (stored encrypted, NOT yet enabled)
    and return the QR for the authenticator app. 2FA only turns on after the
    user confirms a code via /2fa/enable — so you can't lock yourself out here."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    secret = totp.generate_secret()
    user.totp_secret = encrypt(secret)
    user.totp_enabled = False
    await db.commit()

    uri = totp.otpauth_uri(secret, user.email)
    return TwoFASetupResponse(secret=secret, otpauth_uri=uri, qr_data_url=totp.qr_data_url(uri))


@router.post("/2fa/enable", response_model=TwoFAEnableResponse)
async def twofa_enable(
    payload: TwoFAEnableRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Confirm enrollment with a code from the app, then turn 2FA on and return
    one-time backup codes (shown only here — store them safely)."""
    user = await db.get(User, user_id)
    if user is None or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start setup first")

    secret = decrypt(user.totp_secret)
    if not totp.verify_code(secret, payload.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code")

    codes = totp.generate_backup_codes()
    user.totp_backup_codes = totp.hash_backup_codes(codes)
    user.totp_enabled = True
    await db.commit()
    return TwoFAEnableResponse(backup_codes=codes)


@router.post("/2fa/disable", status_code=status.HTTP_204_NO_CONTENT)
async def twofa_disable(
    payload: TwoFADisableRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Turn 2FA off. Requires the current password AND a valid code (or backup
    code) so a stolen session alone can't disable it."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")

    secret = decrypt(user.totp_secret)
    ok = totp.verify_code(secret, payload.code) or (
        totp.consume_backup_code(payload.code, user.totp_backup_codes) is not None
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA code")

    user.totp_enabled = False
    user.totp_secret = None
    user.totp_backup_codes = None
    await db.commit()
