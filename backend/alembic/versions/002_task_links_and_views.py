"""task_links + view-specific task fields (parent_task_id, start_date, end_date, position_x/y)

Revision ID: 002
Revises: 001
Create Date: 2026-05-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


link_type_enum = postgresql.ENUM(
    "blocks", "relates", "duplicates",
    name="link_type",
    create_type=False,
)


def upgrade() -> None:
    link_type_enum.create(op.get_bind(), checkfirst=True)

    # New columns on tasks ─ all nullable so existing rows are fine.
    op.add_column(
        "tasks",
        sa.Column(
            "parent_task_id",
            sa.String(),
            sa.ForeignKey("tasks.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column("tasks", sa.Column("start_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tasks", sa.Column("end_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tasks", sa.Column("position_x", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("position_y", sa.Integer(), nullable=True))

    op.create_index("ix_tasks_topic_parent", "tasks", ["topic_id", "parent_task_id"])
    op.create_index("ix_tasks_topic_start_date", "tasks", ["topic_id", "start_date"])
    op.create_index("ix_tasks_user_due", "tasks", ["user_id", "due_date"])

    # task_links table
    op.create_table(
        "task_links",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "source_id",
            sa.String(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_id",
            sa.String(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("link_type", link_type_enum, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "source_id", "target_id", "link_type", name="uq_task_links_unique"
        ),
        sa.CheckConstraint("source_id <> target_id", name="ck_task_links_no_self"),
    )
    op.create_index(
        "ix_task_links_source_type", "task_links", ["source_id", "link_type"]
    )
    op.create_index(
        "ix_task_links_target_type", "task_links", ["target_id", "link_type"]
    )


def downgrade() -> None:
    op.drop_index("ix_task_links_target_type", table_name="task_links")
    op.drop_index("ix_task_links_source_type", table_name="task_links")
    op.drop_table("task_links")

    op.drop_index("ix_tasks_user_due", table_name="tasks")
    op.drop_index("ix_tasks_topic_start_date", table_name="tasks")
    op.drop_index("ix_tasks_topic_parent", table_name="tasks")
    op.drop_column("tasks", "position_y")
    op.drop_column("tasks", "position_x")
    op.drop_column("tasks", "end_date")
    op.drop_column("tasks", "start_date")
    op.drop_column("tasks", "parent_task_id")

    link_type_enum.drop(op.get_bind(), checkfirst=True)
