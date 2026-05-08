"""tasks.linked_topic_id — promote-to-page support

Revision ID: 006
Revises: 005
Create Date: 2026-05-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column(
            "linked_topic_id",
            sa.String(),
            sa.ForeignKey("topics.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_tasks_linked_topic", "tasks", ["linked_topic_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_tasks_linked_topic", table_name="tasks")
    op.drop_column("tasks", "linked_topic_id")
