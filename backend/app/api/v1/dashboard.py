from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardConfigResponse, DashboardConfigUpdate

router = APIRouter(prefix="/me/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardConfigResponse)
async def get_dashboard_config(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return DashboardConfigResponse(config=user.dashboard_config)


@router.put("", response_model=DashboardConfigResponse)
async def update_dashboard_config(
    payload: DashboardConfigUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.dashboard_config = payload.config
    await db.commit()
    await db.refresh(user)
    return DashboardConfigResponse(config=user.dashboard_config)
