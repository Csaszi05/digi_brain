"""tasks.icon — emoji or icon identifier per task

Revision ID: 008
Revises: 007
Create Date: 2026-05-07

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("icon", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "icon")
