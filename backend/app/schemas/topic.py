from datetime import datetime
from pydantic import BaseModel, Field


class KanbanColumnResponse(BaseModel):
    id: str
    topic_id: str
    name: str
    color: str | None = None
    position: int
    is_done_column: bool

    model_config = {"from_attributes": True}


class TopicCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: str | None = None
    icon: str | None = None
    color: str | None = None


class TopicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    parent_id: str | None = None
    icon: str | None = None
    color: str | None = None
    archived: bool | None = None
    position: int | None = None


class TopicResponse(BaseModel):
    id: str
    user_id: str
    parent_id: str | None = None
    name: str
    icon: str | None = None
    color: str | None = None
    archived: bool
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TopicWithColumnsResponse(TopicResponse):
    kanban_columns: list[KanbanColumnResponse] = Field(default_factory=list)
