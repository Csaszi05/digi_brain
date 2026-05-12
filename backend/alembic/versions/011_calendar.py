"""calendar module — calendar_accounts, calendars, calendar_events

Revision ID: 011
Revises: 010
Create Date: 2026-05-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calendar_accounts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),  # google | apple | outlook | caldav
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("caldav_url", sa.String(500), nullable=False),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("password_encrypted", sa.Text(), nullable=False),
        sa.Column("sync_state", postgresql.JSONB(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_calendar_accounts_user", "calendar_accounts", ["user_id"])

    op.create_table(
        "calendars",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("calendar_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_id", sa.String(500), nullable=False),  # CalDAV calendar URL
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("topic_id", sa.String(), sa.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_calendars_account", "calendars", ["account_id"])
    op.create_index("ix_calendars_user", "calendars", ["user_id"])

    op.create_table(
        "calendar_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("calendar_id", sa.String(), sa.ForeignKey("calendars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_uid", sa.String(500), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("location", sa.String(500), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("topic_id", sa.String(), sa.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("time_entry_id", sa.String(), sa.ForeignKey("time_entries.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recurrence", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="confirmed"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_calendar_events_calendar", "calendar_events", ["calendar_id"])
    op.create_index("ix_calendar_events_user_starts", "calendar_events", ["user_id", "starts_at"])
    op.create_index("ix_calendar_events_uid", "calendar_events", ["external_uid"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_calendar_events_uid", table_name="calendar_events")
    op.drop_index("ix_calendar_events_user_starts", table_name="calendar_events")
    op.drop_index("ix_calendar_events_calendar", table_name="calendar_events")
    op.drop_table("calendar_events")
    op.drop_index("ix_calendars_user", table_name="calendars")
    op.drop_index("ix_calendars_account", table_name="calendars")
    op.drop_table("calendars")
    op.drop_index("ix_calendar_accounts_user", table_name="calendar_accounts")
    op.drop_table("calendar_accounts")
