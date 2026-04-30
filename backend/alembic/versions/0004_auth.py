"""Add password_hash and is_demo columns to users.

Revision ID: 0004_auth
Revises: 0003_priority_and_search
Create Date: 2026-04-30 12:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_auth"
down_revision = "0003_priority_and_search"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
    op.drop_column("users", "is_demo")
