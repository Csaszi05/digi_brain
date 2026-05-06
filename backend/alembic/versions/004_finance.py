"""finance — Phase 2 (categories, transactions, budgets)

Revision ID: 004
Revises: 003
Create Date: 2026-05-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


transaction_kind = postgresql.ENUM(
    "expense", "income",
    name="transaction_kind",
    create_type=False,
)
budget_period = postgresql.ENUM(
    "weekly", "monthly", "yearly",
    name="budget_period",
    create_type=False,
)


def upgrade() -> None:
    transaction_kind.create(op.get_bind(), checkfirst=True)
    budget_period.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "categories",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
    )
    op.create_index("ix_categories_user", "categories", ["user_id"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "topic_id",
            sa.String(),
            sa.ForeignKey("topics.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "category_id",
            sa.String(),
            sa.ForeignKey("categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="HUF"),
        sa.Column("kind", transaction_kind, nullable=False, server_default="expense"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_transactions_user_date", "transactions", ["user_id", "date"])
    op.create_index(
        "ix_transactions_user_cat_date",
        "transactions",
        ["user_id", "category_id", "date"],
    )

    op.create_table(
        "budgets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "category_id",
            sa.String(),
            sa.ForeignKey("categories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="HUF"),
        sa.Column("period", budget_period, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "user_id", "category_id", "period", name="uq_budgets_user_category_period"
        ),
    )
    op.create_index("ix_budgets_user", "budgets", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_budgets_user", table_name="budgets")
    op.drop_table("budgets")

    op.drop_index("ix_transactions_user_cat_date", table_name="transactions")
    op.drop_index("ix_transactions_user_date", table_name="transactions")
    op.drop_table("transactions")

    op.drop_index("ix_categories_user", table_name="categories")
    op.drop_table("categories")

    budget_period.drop(op.get_bind(), checkfirst=True)
    transaction_kind.drop(op.get_bind(), checkfirst=True)
