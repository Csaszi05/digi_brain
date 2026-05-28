from datetime import datetime
from pydantic import BaseModel, Field


class ShoppingListCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    icon: str | None = Field(default=None, max_length=20)
    position: int | None = None


class ShoppingListUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    icon: str | None = Field(default=None, max_length=20)
    position: int | None = None


class ShoppingListResponse(BaseModel):
    id: str
    user_id: str
    name: str
    icon: str
    position: int
    item_count: int = 0
    checked_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShoppingItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    quantity: str | None = Field(default=None, max_length=100)
    note: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=50)
    position: int | None = None


class ShoppingItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=500)
    quantity: str | None = Field(default=None, max_length=100)
    note: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, max_length=50)
    checked: bool | None = None
    position: int | None = None


class ShoppingItemResponse(BaseModel):
    id: str
    list_id: str
    name: str
    quantity: str | None = None
    note: str | None = None
    category: str | None = None
    checked: bool
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
