from datetime import datetime
from pydantic import BaseModel


class TimeEntryStart(BaseModel):
    topic_id: str
    task_id: str | None = None
    note: str | None = None


class TimeEntryUpdate(BaseModel):
    topic_id: str | None = None
    task_id: str | None = None
    note: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None


class TimeEntryResponse(BaseModel):
    id: str
    user_id: str
    topic_id: str
    task_id: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
