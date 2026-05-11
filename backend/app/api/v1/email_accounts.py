from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.crypto import encrypt, decrypt
from app.core.database import get_db
from app.models.inbox import EmailAccount
from app.schemas.inbox import EmailAccountCreate, EmailAccountResponse
from app.services.imap_sync import sync_account

router = APIRouter(prefix="/email-accounts", tags=["inbox"])


class EmailAccountCreateWithPassword(EmailAccountCreate):
    password: str = Field(..., min_length=1, description="App password or OAuth token")


class TestResult(BaseModel):
    ok: bool
    message: str


@router.get("", response_model=list[EmailAccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.user_id == user_id).order_by(EmailAccount.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=EmailAccountResponse, status_code=201)
async def add_account(
    payload: EmailAccountCreateWithPassword,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = EmailAccount(
        user_id=user_id,
        provider=payload.provider,
        email=payload.email,
        display_name=payload.display_name,
        imap_host=payload.imap_host,
        imap_port=payload.imap_port,
        oauth_token_encrypted=encrypt(payload.password),
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.post("/{account_id}/test", response_model=TestResult)
async def test_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = await _get_owned(db, account_id, user_id)
    try:
        from imapclient import IMAPClient
        password = decrypt(account.oauth_token_encrypted)
        with IMAPClient(account.imap_host, port=account.imap_port or 993, ssl=True, timeout=10) as client:
            client.login(account.email, password)
        return TestResult(ok=True, message="Connected successfully")
    except Exception as exc:
        return TestResult(ok=False, message=str(exc))


@router.post("/{account_id}/sync", response_model=dict)
async def trigger_sync(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = await _get_owned(db, account_id, user_id)
    count = await sync_account(account, db)
    return {"synced": count}


@router.patch("/{account_id}/active", response_model=EmailAccountResponse)
async def set_active(
    account_id: str,
    active: bool,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = await _get_owned(db, account_id, user_id)
    account.active = active
    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = await _get_owned(db, account_id, user_id)
    await db.delete(account)
    await db.commit()


async def _get_owned(db: AsyncSession, account_id: str, user_id: str) -> EmailAccount:
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.id == account_id, EmailAccount.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account
