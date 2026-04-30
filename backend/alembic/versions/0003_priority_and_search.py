"""Priority tiers, accessibility flags, and full-text search index.

Revision ID: 0003_priority_and_search
Revises: 0002_indexes
Create Date: 2026-04-29 14:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_priority_and_search"
down_revision = "0002_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Priority tier & accessibility on users
    op.add_column("users", sa.Column("priority_tier", sa.String(30), nullable=False, server_default="resident"))
    op.add_column("users", sa.Column("accessibility_needs", sa.Boolean(), nullable=False, server_default="false"))

    # Sync tier with role for existing rows
    op.execute("UPDATE users SET priority_tier = 'staff'      WHERE role = 'staff'")
    op.execute("UPDATE users SET priority_tier = 'councillor' WHERE role = 'councillor'")

    # Full-text search expression index on assets
    # Expression: name + description + ward + category concatenated
    op.execute("""
        CREATE INDEX ix_assets_fts ON assets USING GIN (
            to_tsvector(
                'english',
                name || ' ' || COALESCE(description, '') || ' ' || ward || ' ' || category
            )
        )
    """)

    # Index on bookings for priority window queries
    op.create_index("idx_bookings_user_confirmed_at", "bookings", ["user_id", "confirmed_at"])


def downgrade() -> None:
    op.drop_index("idx_bookings_user_confirmed_at", table_name="bookings")
    op.execute("DROP INDEX IF EXISTS ix_assets_fts")
    op.drop_column("users", "accessibility_needs")
    op.drop_column("users", "priority_tier")
