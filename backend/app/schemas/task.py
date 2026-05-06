from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    column_id: str
    priority: TaskPriority = TaskPriority.medium
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    column_id: str | None = None
    priority: TaskPriority | None = None
    due_date: datetime | None = None
    position: int | None = None


class TaskResponse(BaseModel):
    id: str
    topic_id: str
    user_id: str
    column_id: str
    title: str
    description: str | None = None
    priority: TaskPriority
    due_date: datetime | None = None
    position: int
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
