"""time_entries — Phase 2 time tracking

Revision ID: 003
Revises: 002
Create Date: 2026-05-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "time_entries",
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
            sa.ForeignKey("topics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "task_id",
            sa.String(),
            sa.ForeignKey("tasks.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_time_entries_user_started", "time_entries", ["user_id", "started_at"])
    op.create_index("ix_time_entries_topic", "time_entries", ["topic_id"])
    # Partial index — at most one running entry per user is enforced via app logic,
    # but this index makes the "find active entry" query trivial.
    op.create_index(
        "ix_time_entries_user_active",
        "time_entries",
        ["user_id"],
        postgresql_where=sa.text("ended_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_time_entries_user_active", table_name="time_entries")
    op.drop_index("ix_time_entries_topic", table_name="time_entries")
    op.drop_index("ix_time_entries_user_started", table_name="time_entries")
    op.drop_table("time_entries")
