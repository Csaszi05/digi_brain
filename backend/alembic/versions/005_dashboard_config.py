"""dashboard_config column on users

Revision ID: 005
Revises: 004
Create Date: 2026-05-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("dashboard_config", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "dashboard_config")
