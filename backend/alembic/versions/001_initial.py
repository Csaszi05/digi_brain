"""initial schema - Phase 1 (users, topics, kanban_columns, tasks, notes)

Revision ID: 001
Revises:
Create Date: 2026-05-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


task_priority = postgresql.ENUM(
    "low", "medium", "high",
    name="task_priority",
    create_type=False,
)


def upgrade() -> None:
    task_priority.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("master_key_salt", sa.String(255), nullable=True),
        sa.Column("default_currency", sa.String(3), nullable=False, server_default="HUF"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "topics",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", sa.String(), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_topics_user_parent", "topics", ["user_id", "parent_id"])

    op.create_table(
        "kanban_columns",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("topic_id", sa.String(), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_done_column", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_kanban_columns_topic_position", "kanban_columns", ["topic_id", "position"])

    op.create_table(
        "tasks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("topic_id", sa.String(), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("column_id", sa.String(), sa.ForeignKey("kanban_columns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", task_priority, nullable=False, server_default="medium"),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_tasks_topic_column_position", "tasks", ["topic_id", "column_id", "position"])
    op.create_index("ix_tasks_user", "tasks", ["user_id"])

    op.create_table(
        "notes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic_id", sa.String(), sa.ForeignKey("topics.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("file_path", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notes_user", "notes", ["user_id"])
    op.create_index("ix_notes_topic", "notes", ["topic_id"])


def downgrade() -> None:
    op.drop_index("ix_notes_topic", table_name="notes")
    op.drop_index("ix_notes_user", table_name="notes")
    op.drop_table("notes")

    op.drop_index("ix_tasks_user", table_name="tasks")
    op.drop_index("ix_tasks_topic_column_position", table_name="tasks")
    op.drop_table("tasks")

    op.drop_index("ix_kanban_columns_topic_position", table_name="kanban_columns")
    op.drop_table("kanban_columns")

    op.drop_index("ix_topics_user_parent", table_name="topics")
    op.drop_table("topics")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    task_priority.drop(op.get_bind(), checkfirst=True)
