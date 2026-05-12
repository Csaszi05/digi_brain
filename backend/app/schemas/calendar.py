from datetime import datetime
from pydantic import BaseModel, Field


class CalendarAccountCreate(BaseModel):
    provider: str = Field(..., max_length=20)
    display_name: str | None = Field(default=None, max_length=255)
    caldav_url: str = Field(..., max_length=500)
    username: str = Field(..., max_length=255)
    password: str = Field(..., min_length=1)


class CalendarAccountResponse(BaseModel):
    id: str
    user_id: str
    provider: str
    display_name: str | None = None
    caldav_url: str
    username: str
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CalendarResponse(BaseModel):
    id: str
    account_id: str
    user_id: str
    external_id: str
    name: str
    color: str | None = None
    topic_id: str | None = None
    active: bool

    model_config = {"from_attributes": True}


class CalendarUpdate(BaseModel):
    topic_id: str | None = None
    active: bool | None = None
    color: str | None = None


class CalendarEventResponse(BaseModel):
    id: str
    calendar_id: str
    user_id: str
    external_uid: str
    title: str
    description: str | None = None
    location: str | None = None
    starts_at: datetime
    ends_at: datetime
    all_day: bool
    topic_id: str | None = None
    time_entry_id: str | None = None
    status: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class CalendarEventCreate(BaseModel):
    calendar_id: str
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    location: str | None = None
    starts_at: datetime
    ends_at: datetime
    all_day: bool = False
    topic_id: str | None = None


class CalendarEventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    location: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    all_day: bool | None = None
    topic_id: str | None = None


class LogAsTimeEntryRequest(BaseModel):
    note: str | None = None
