"""Add futures_chain table for front-month futures analytics.

Revision ID: 0002_add_futures_chain
Revises: 0001_initial
Create Date: 2026-06-28 22:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_add_futures_chain"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "futures_chain",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("instrument", sa.String(length=10), nullable=False),
        sa.Column("instrument_type", sa.String(length=10), nullable=False),
        sa.Column("expiry", sa.Date(), nullable=False),
        sa.Column("expiry_type", sa.String(length=10), nullable=False),
        sa.Column("open", sa.Numeric(12, 2), nullable=True),
        sa.Column("high", sa.Numeric(12, 2), nullable=True),
        sa.Column("low", sa.Numeric(12, 2), nullable=True),
        sa.Column("close", sa.Numeric(12, 2), nullable=True),
        sa.Column("settle_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("volume", sa.BigInteger(), nullable=True),
        sa.Column("turnover_lakh", sa.Numeric(14, 2), nullable=True),
        sa.Column("oi", sa.BigInteger(), nullable=True),
        sa.Column("change_oi", sa.BigInteger(), nullable=True),
        sa.Column("underlying_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint(
            "trade_date",
            "symbol",
            "expiry",
            "instrument",
            name="uq_fc_trade_symbol_expiry_instrument",
        ),
    )
    op.create_index("idx_fc_symbol_trade_date", "futures_chain", ["symbol", "trade_date"])
    op.create_index("idx_fc_symbol_expiry", "futures_chain", ["symbol", "expiry"])
    op.create_index("idx_fc_trade_date", "futures_chain", ["trade_date"])


def downgrade() -> None:
    op.drop_index("idx_fc_trade_date", table_name="futures_chain")
    op.drop_index("idx_fc_symbol_expiry", table_name="futures_chain")
    op.drop_index("idx_fc_symbol_trade_date", table_name="futures_chain")
    op.drop_table("futures_chain")
