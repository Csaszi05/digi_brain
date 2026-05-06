from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.finance import Budget, Category, Transaction
from app.models.topic import Topic
from app.schemas.finance import (
    BudgetCreate,
    BudgetResponse,
    BudgetUpdate,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(tags=["finance"])


async def _ensure_category_owned(db: AsyncSession, category_id: str, user_id: str) -> Category:
    cat = await db.get(Category, category_id)
    if cat is None or cat.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return cat


async def _ensure_topic_owned_or_none(
    db: AsyncSession, topic_id: str | None, user_id: str
) -> None:
    if topic_id is None:
        return
    topic = await db.get(Topic, topic_id)
    if topic is None or topic.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")


# ─── Categories ───────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Category).where(Category.user_id == user_id).order_by(Category.name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    payload: CategoryCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    cat = Category(
        user_id=user_id,
        name=payload.name,
        color=payload.color,
        icon=payload.icon,
    )
    db.add(cat)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists",
        )
    await db.refresh(cat)
    return cat


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    cat = await _ensure_category_owned(db, category_id, user_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(cat, key, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists",
        )
    await db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    cat = await _ensure_category_owned(db, category_id, user_id)
    try:
        await db.delete(cat)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category has transactions — delete or reassign them first",
        )


# ─── Transactions ─────────────────────────────────────────

@router.get("/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    since: date_type | None = Query(None),
    until: date_type | None = Query(None),
    category_id: str | None = Query(None),
    topic_id: str | None = Query(None),
    limit: int = Query(500, ge=1, le=2000),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Transaction).where(Transaction.user_id == user_id)
    if since is not None:
        stmt = stmt.where(Transaction.date >= since)
    if until is not None:
        stmt = stmt.where(Transaction.date < until)
    if category_id is not None:
        stmt = stmt.where(Transaction.category_id == category_id)
    if topic_id is not None:
        stmt = stmt.where(Transaction.topic_id == topic_id)
    stmt = stmt.order_by(Transaction.date.desc(), Transaction.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_transaction(
    payload: TransactionCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_category_owned(db, payload.category_id, user_id)
    await _ensure_topic_owned_or_none(db, payload.topic_id, user_id)

    tx = Transaction(
        user_id=user_id,
        category_id=payload.category_id,
        topic_id=payload.topic_id,
        amount=payload.amount,
        currency=payload.currency,
        kind=payload.kind.value,
        note=payload.note,
        date=payload.date,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


@router.patch("/transactions/{tx_id}", response_model=TransactionResponse)
async def update_transaction(
    tx_id: str,
    payload: TransactionUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    tx = await db.get(Transaction, tx_id)
    if tx is None or tx.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    updates = payload.model_dump(exclude_unset=True)
    if "category_id" in updates and updates["category_id"] is not None:
        await _ensure_category_owned(db, updates["category_id"], user_id)
    if "topic_id" in updates:
        await _ensure_topic_owned_or_none(db, updates["topic_id"], user_id)
    if "kind" in updates and updates["kind"] is not None and hasattr(updates["kind"], "value"):
        updates["kind"] = updates["kind"].value

    for key, value in updates.items():
        setattr(tx, key, value)

    await db.commit()
    await db.refresh(tx)
    return tx


@router.delete("/transactions/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    tx_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    tx = await db.get(Transaction, tx_id)
    if tx is None or tx.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    await db.delete(tx)
    await db.commit()


# ─── Budgets ──────────────────────────────────────────────

@router.get("/budgets", response_model=list[BudgetResponse])
async def list_budgets(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Budget).where(Budget.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/budgets",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_budget(
    payload: BudgetCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_category_owned(db, payload.category_id, user_id)
    budget = Budget(
        user_id=user_id,
        category_id=payload.category_id,
        amount=payload.amount,
        currency=payload.currency,
        period=payload.period.value,
    )
    db.add(budget)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A budget already exists for this category and period",
        )
    await db.refresh(budget)
    return budget


@router.patch("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    payload: BudgetUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    budget = await db.get(Budget, budget_id)
    if budget is None or budget.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")

    updates = payload.model_dump(exclude_unset=True)
    if "period" in updates and updates["period"] is not None and hasattr(updates["period"], "value"):
        updates["period"] = updates["period"].value
    for key, value in updates.items():
        setattr(budget, key, value)

    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    budget = await db.get(Budget, budget_id)
    if budget is None or budget.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    await db.delete(budget)
    await db.commit()
