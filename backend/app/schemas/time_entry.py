from datetime import datetime
from pydantic import BaseModel, field_validator


class TimeEntryStart(BaseModel):
    topic_id: str
    task_id: str | None = None
    note: str | None = None


class TimeEntryManualCreate(BaseModel):
    """Create a past/completed time entry with explicit start + end times."""
    topic_id: str
    task_id: str | None = None
    started_at: datetime
    ended_at: datetime
    note: str | None = None

    @field_validator("ended_at")
    @classmethod
    def ended_after_started(cls, v: datetime, info: object) -> datetime:
        data = getattr(info, "data", {})
        started = data.get("started_at")
        if started and v <= started:
            raise ValueError("ended_at must be after started_at")
        return v


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
