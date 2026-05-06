from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Text, Date, ForeignKey, DateTime, Numeric, func, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import uuid
import enum


class TransactionKind(str, enum.Enum):
    expense = "expense"
    income = "income"


class BudgetPeriod(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_categories_user_name"),)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="HUF")
    kind: Mapped[TransactionKind] = mapped_column(SAEnum(TransactionKind, name="transaction_kind"), nullable=False, default=TransactionKind.expense)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="HUF")
    period: Mapped[BudgetPeriod] = mapped_column(SAEnum(BudgetPeriod, name="budget_period"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "category_id", "period", name="uq_budgets_user_category_period"),
    )
