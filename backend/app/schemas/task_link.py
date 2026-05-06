from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class LinkType(str, Enum):
    blocks = "blocks"
    relates = "relates"
    duplicates = "duplicates"


class TaskLinkCreate(BaseModel):
    target_id: str
    link_type: LinkType


class TaskLinkResponse(BaseModel):
    id: str
    source_id: str
    target_id: str
    link_type: LinkType
    created_at: datetime

    model_config = {"from_attributes": True}
