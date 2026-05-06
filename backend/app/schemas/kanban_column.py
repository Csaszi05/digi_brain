from pydantic import BaseModel, Field


class KanbanColumnCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str | None = None
    is_done_column: bool = False


class KanbanColumnUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    is_done_column: bool | None = None
    position: int | None = None


class KanbanColumnResponse(BaseModel):
    id: str
    topic_id: str
    name: str
    color: str | None = None
    position: int
    is_done_column: bool

    model_config = {"from_attributes": True}
