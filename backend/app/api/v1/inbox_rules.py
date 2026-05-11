from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.inbox import InboxRule
from app.schemas.inbox import InboxRuleCreate, InboxRuleUpdate, InboxRuleResponse

router = APIRouter(prefix="/inbox/rules", tags=["inbox"])


@router.get("", response_model=list[InboxRuleResponse])
async def list_rules(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(InboxRule)
        .where(InboxRule.user_id == user_id)
        .order_by(InboxRule.position)
    )
    return result.scalars().all()


@router.post("", response_model=InboxRuleResponse, status_code=201)
async def create_rule(
    payload: InboxRuleCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rule = InboxRule(user_id=user_id, **payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.patch("/{rule_id}", response_model=InboxRuleResponse)
async def update_rule(
    rule_id: str,
    payload: InboxRuleUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rule = await _get_owned_rule(db, rule_id, user_id)
    changes = payload.model_dump(exclude_none=True)
    for k, v in changes.items():
        setattr(rule, k, v)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rule = await _get_owned_rule(db, rule_id, user_id)
    await db.delete(rule)
    await db.commit()


async def _get_owned_rule(db: AsyncSession, rule_id: str, user_id: str) -> InboxRule:
    result = await db.execute(
        select(InboxRule).where(InboxRule.id == rule_id, InboxRule.user_id == user_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule
