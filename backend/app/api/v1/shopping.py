from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.shopping import ShoppingList, ShoppingItem
from app.schemas.shopping import (
    ShoppingListCreate, ShoppingListUpdate, ShoppingListResponse,
    ShoppingItemCreate, ShoppingItemUpdate, ShoppingItemResponse,
)
from app.services.shopping_categorizer import categorize

router = APIRouter(prefix="/shopping", tags=["shopping"])


# ─── Lists ────────────────────────────────────────────────

@router.get("/lists", response_model=list[ShoppingListResponse])
async def list_lists(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Lists + aggregate counts in one go
    total_q = (
        select(ShoppingItem.list_id, func.count().label("item_count"))
        .group_by(ShoppingItem.list_id)
        .subquery()
    )
    checked_q = (
        select(ShoppingItem.list_id, func.count().label("checked_count"))
        .where(ShoppingItem.checked.is_(True))
        .group_by(ShoppingItem.list_id)
        .subquery()
    )
    result = await db.execute(
        select(
            ShoppingList,
            func.coalesce(total_q.c.item_count, 0),
            func.coalesce(checked_q.c.checked_count, 0),
        )
        .outerjoin(total_q, total_q.c.list_id == ShoppingList.id)
        .outerjoin(checked_q, checked_q.c.list_id == ShoppingList.id)
        .where(ShoppingList.user_id == user_id)
        .order_by(ShoppingList.position, ShoppingList.created_at)
    )
    out: list[ShoppingListResponse] = []
    for lst, total, checked in result.all():
        out.append(ShoppingListResponse(
            id=lst.id, user_id=lst.user_id, name=lst.name, icon=lst.icon,
            position=lst.position, item_count=int(total), checked_count=int(checked),
            created_at=lst.created_at, updated_at=lst.updated_at,
        ))
    return out


@router.post("/lists", response_model=ShoppingListResponse, status_code=201)
async def create_list(
    payload: ShoppingListCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # next position
    max_pos = await db.scalar(
        select(func.coalesce(func.max(ShoppingList.position), -1))
        .where(ShoppingList.user_id == user_id)
    )
    lst = ShoppingList(
        user_id=user_id,
        name=payload.name,
        icon=payload.icon or "🛒",
        position=payload.position if payload.position is not None else int(max_pos) + 1,
    )
    db.add(lst)
    await db.commit()
    await db.refresh(lst)
    return ShoppingListResponse(
        id=lst.id, user_id=lst.user_id, name=lst.name, icon=lst.icon,
        position=lst.position, item_count=0, checked_count=0,
        created_at=lst.created_at, updated_at=lst.updated_at,
    )


@router.patch("/lists/{list_id}", response_model=ShoppingListResponse)
async def update_list(
    list_id: str,
    payload: ShoppingListUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    lst = await _get_owned_list(db, list_id, user_id)
    changes = payload.model_dump(exclude_none=True)
    for k, v in changes.items():
        setattr(lst, k, v)
    await db.commit()
    await db.refresh(lst)

    # counts for response
    total = await db.scalar(select(func.count()).where(ShoppingItem.list_id == lst.id)) or 0
    checked = await db.scalar(
        select(func.count()).where(ShoppingItem.list_id == lst.id, ShoppingItem.checked.is_(True))
    ) or 0
    return ShoppingListResponse(
        id=lst.id, user_id=lst.user_id, name=lst.name, icon=lst.icon,
        position=lst.position, item_count=int(total), checked_count=int(checked),
        created_at=lst.created_at, updated_at=lst.updated_at,
    )


@router.delete("/lists/{list_id}", status_code=204)
async def delete_list(
    list_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    lst = await _get_owned_list(db, list_id, user_id)
    await db.delete(lst)
    await db.commit()


# ─── Items ────────────────────────────────────────────────

@router.get("/lists/{list_id}/items", response_model=list[ShoppingItemResponse])
async def list_items(
    list_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    await _get_owned_list(db, list_id, user_id)
    result = await db.execute(
        select(ShoppingItem)
        .where(ShoppingItem.list_id == list_id)
        .order_by(ShoppingItem.checked, ShoppingItem.position, ShoppingItem.created_at)
    )
    return result.scalars().all()


@router.post("/lists/{list_id}/items", response_model=ShoppingItemResponse, status_code=201)
async def create_item(
    list_id: str,
    payload: ShoppingItemCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    await _get_owned_list(db, list_id, user_id)

    category = payload.category if payload.category else categorize(payload.name)

    max_pos = await db.scalar(
        select(func.coalesce(func.max(ShoppingItem.position), -1))
        .where(ShoppingItem.list_id == list_id)
    )
    item = ShoppingItem(
        list_id=list_id,
        name=payload.name,
        quantity=payload.quantity,
        note=payload.note,
        category=category,
        position=payload.position if payload.position is not None else int(max_pos) + 1,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/items/{item_id}", response_model=ShoppingItemResponse)
async def update_item(
    item_id: str,
    payload: ShoppingItemUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    item = await _get_owned_item(db, item_id, user_id)
    changes = payload.model_dump(exclude_unset=True)

    # If name changes and category wasn't explicitly set, re-categorize
    if "name" in changes and "category" not in changes:
        item.category = categorize(changes["name"])

    for k, v in changes.items():
        setattr(item, k, v)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    item = await _get_owned_item(db, item_id, user_id)
    await db.delete(item)
    await db.commit()


@router.post("/lists/{list_id}/clear-checked", response_model=dict)
async def clear_checked(
    list_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    await _get_owned_list(db, list_id, user_id)
    result = await db.execute(
        select(ShoppingItem.id).where(
            ShoppingItem.list_id == list_id, ShoppingItem.checked.is_(True),
        )
    )
    ids = [r[0] for r in result.all()]
    if not ids:
        return {"deleted": 0}
    for iid in ids:
        item = await db.get(ShoppingItem, iid)
        if item:
            await db.delete(item)
    await db.commit()
    return {"deleted": len(ids)}


@router.post("/lists/{list_id}/uncheck-all", response_model=dict)
async def uncheck_all(
    list_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Reset all checked items back to unchecked (e.g. start a fresh shop)."""
    await _get_owned_list(db, list_id, user_id)
    await db.execute(
        update(ShoppingItem)
        .where(ShoppingItem.list_id == list_id, ShoppingItem.checked.is_(True))
        .values(checked=False)
    )
    await db.commit()
    return {"ok": True}


# ─── Helpers ──────────────────────────────────────────────

async def _get_owned_list(db: AsyncSession, list_id: str, user_id: str) -> ShoppingList:
    result = await db.execute(
        select(ShoppingList).where(ShoppingList.id == list_id, ShoppingList.user_id == user_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return obj


async def _get_owned_item(db: AsyncSession, item_id: str, user_id: str) -> ShoppingItem:
    result = await db.execute(
        select(ShoppingItem)
        .join(ShoppingList, ShoppingList.id == ShoppingItem.list_id)
        .where(ShoppingItem.id == item_id, ShoppingList.user_id == user_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Shopping item not found")
    return obj
