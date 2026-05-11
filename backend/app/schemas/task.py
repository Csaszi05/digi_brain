from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


FIBONACCI = {1, 2, 3, 5, 8, 13, 21}


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    column_id: str
    priority: TaskPriority = TaskPriority.medium
    parent_task_id: str | None = None
    icon: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    due_date: datetime | None = None
    story_points: int | None = Field(default=None, ge=1, le=100)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    column_id: str | None = None
    priority: TaskPriority | None = None
    parent_task_id: str | None = None
    linked_topic_id: str | None = None
    icon: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    due_date: datetime | None = None
    position: int | None = None
    position_x: int | None = None
    position_y: int | None = None
    story_points: int | None = Field(default=None, ge=1, le=100)


class TaskResponse(BaseModel):
    id: str
    topic_id: str
    user_id: str
    column_id: str
    parent_task_id: str | None = None
    linked_topic_id: str | None = None
    story_points: int | None = None
    icon: str | None = None
    title: str
    description: str | None = None
    priority: TaskPriority
    start_date: datetime | None = None
    end_date: datetime | None = None
    due_date: datetime | None = None
    position: int
    position_x: int | None = None
    position_y: int | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
