"""inbox module — email_accounts, tickets, ticket_messages, inbox_rules, ticket_activity

Revision ID: 010
Revises: 009
Create Date: 2026-05-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "010"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_accounts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),  # 'imap' | 'gmail' | 'outlook'
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("imap_host", sa.String(255), nullable=True),
        sa.Column("imap_port", sa.Integer(), nullable=True),
        sa.Column("oauth_token_encrypted", sa.Text(), nullable=True),
        sa.Column("sync_state", postgresql.JSONB(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_accounts_user", "email_accounts", ["user_id"])

    op.create_table(
        "tickets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("email_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic_id", sa.String(), sa.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("linked_task_id", sa.String(), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("thread_id", sa.String(500), nullable=False),
        sa.Column("subject", sa.String(1000), nullable=False),
        sa.Column("from_name", sa.String(255), nullable=True),
        sa.Column("from_email", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("priority", sa.String(10), nullable=False, server_default="med"),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("ai_intent", sa.String(50), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unread", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_tickets_user_status", "tickets", ["user_id", "status"])
    op.create_index("ix_tickets_user_last_msg", "tickets", ["user_id", "last_message_at"])
    op.create_index("ix_tickets_topic", "tickets", ["topic_id"])

    op.create_table(
        "ticket_messages",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("ticket_id", sa.String(), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("direction", sa.String(3), nullable=False),  # 'in' | 'out'
        sa.Column("from_name", sa.String(255), nullable=True),
        sa.Column("from_email", sa.String(255), nullable=True),
        sa.Column("to_emails", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("external_id", sa.String(500), nullable=True),
    )
    op.create_index("ix_ticket_messages_ticket", "ticket_messages", ["ticket_id"])

    op.create_table(
        "inbox_rules",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("conditions", postgresql.JSONB(), nullable=False),
        sa.Column("actions", postgresql.JSONB(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("run_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_inbox_rules_user", "inbox_rules", ["user_id", "position"])

    op.create_table(
        "ticket_activity",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("ticket_id", sa.String(), sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("actor", sa.String(100), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ticket_activity_ticket", "ticket_activity", ["ticket_id", "at"])


def downgrade() -> None:
    op.drop_index("ix_ticket_activity_ticket", table_name="ticket_activity")
    op.drop_table("ticket_activity")
    op.drop_index("ix_inbox_rules_user", table_name="inbox_rules")
    op.drop_table("inbox_rules")
    op.drop_index("ix_ticket_messages_ticket", table_name="ticket_messages")
    op.drop_table("ticket_messages")
    op.drop_index("ix_tickets_topic", table_name="tickets")
    op.drop_index("ix_tickets_user_last_msg", table_name="tickets")
    op.drop_index("ix_tickets_user_status", table_name="tickets")
    op.drop_table("tickets")
    op.drop_index("ix_email_accounts_user", table_name="email_accounts")
    op.drop_table("email_accounts")
