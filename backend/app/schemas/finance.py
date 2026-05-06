from datetime import date as date_type, datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field


class TransactionKind(str, Enum):
    expense = "expense"
    income = "income"


class BudgetPeriod(str, Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


# ─── Category ─────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str | None = None
    icon: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = None
    icon: str | None = None


class CategoryResponse(BaseModel):
    id: str
    user_id: str
    name: str
    color: str | None = None
    icon: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Transaction ──────────────────────────────────────────

class TransactionCreate(BaseModel):
    category_id: str
    amount: Decimal
    currency: str = Field(default="HUF", min_length=3, max_length=3)
    kind: TransactionKind = TransactionKind.expense
    note: str | None = None
    date: date_type
    topic_id: str | None = None


class TransactionUpdate(BaseModel):
    category_id: str | None = None
    amount: Decimal | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    kind: TransactionKind | None = None
    note: str | None = None
    date: date_type | None = None
    topic_id: str | None = None


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    category_id: str
    topic_id: str | None = None
    amount: Decimal
    currency: str
    kind: TransactionKind
    note: str | None = None
    date: date_type
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Budget ───────────────────────────────────────────────

class BudgetCreate(BaseModel):
    category_id: str
    amount: Decimal
    currency: str = Field(default="HUF", min_length=3, max_length=3)
    period: BudgetPeriod


class BudgetUpdate(BaseModel):
    amount: Decimal | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    period: BudgetPeriod | None = None


class BudgetResponse(BaseModel):
    id: str
    user_id: str
    category_id: str
    amount: Decimal
    currency: str
    period: BudgetPeriod
    created_at: datetime

    model_config = {"from_attributes": True}
