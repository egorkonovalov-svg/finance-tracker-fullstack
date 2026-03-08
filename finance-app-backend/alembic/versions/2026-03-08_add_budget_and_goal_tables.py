"""add budget and goal tables

Revision ID: 85134e7a7ab6
Revises:
Create Date: 2026-03-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "85134e7a7ab6"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "budget",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id"),
            nullable=False,
        ),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("amount_limit", sa.Numeric(12, 2), nullable=False),
        sa.UniqueConstraint("user_id", "category"),
    )

    op.create_table(
        "goal",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("target_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("target_date", sa.Date, nullable=False),
        sa.Column("current_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("goal")
    op.drop_table("budget")
