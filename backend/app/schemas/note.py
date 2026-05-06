from datetime import datetime
from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = ""
    topic_id: str | None = None


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    content: str | None = None
    topic_id: str | None = None


class NoteResponse(BaseModel):
    id: str
    user_id: str
    topic_id: str | None = None
    title: str
    content: str
    file_path: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
