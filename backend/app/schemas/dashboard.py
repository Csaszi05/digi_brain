from typing import Any
from pydantic import BaseModel


class DashboardConfigResponse(BaseModel):
    config: dict[str, Any] | None = None


class DashboardConfigUpdate(BaseModel):
    config: dict[str, Any]
