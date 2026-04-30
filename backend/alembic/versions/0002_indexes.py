"""Add performance indexes

Revision ID: 0002_indexes
Revises: 0001_initial
Create Date: 2026-04-29 13:00:00
"""
from alembic import op


revision = "0002_indexes"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # audit_log: dashboard feed queries order by created_at DESC
    op.create_index("idx_audit_log_created_at", "audit_log", ["created_at"])
    op.create_index("idx_audit_log_booking_id", "audit_log", ["booking_id"])

    # agent_runs: recent runs query orders by created_at DESC
    op.create_index("idx_agent_runs_created_at", "agent_runs", ["created_at"])
    op.create_index("idx_agent_runs_booking_id", "agent_runs", ["related_booking_id"])

    # search_logs: demand sensing query orders by created_at DESC
    op.create_index("idx_search_logs_created_at", "search_logs", ["created_at"])

    # reminders: due reminders query filters on sent=false and remind_at <= now()
    op.create_index("idx_reminders_due", "reminders", ["remind_at", "sent"])
    op.create_index("idx_reminders_user", "reminders", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_reminders_user", table_name="reminders")
    op.drop_index("idx_reminders_due", table_name="reminders")
    op.drop_index("idx_search_logs_created_at", table_name="search_logs")
    op.drop_index("idx_agent_runs_booking_id", table_name="agent_runs")
    op.drop_index("idx_agent_runs_created_at", table_name="agent_runs")
    op.drop_index("idx_audit_log_booking_id", table_name="audit_log")
    op.drop_index("idx_audit_log_created_at", table_name="audit_log")
