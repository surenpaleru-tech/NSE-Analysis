"""Initial schema — all NSE Intelligence tables

Revision ID: 0001_initial
Revises: 
Create Date: 2024-11-25 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\"")

    # -------------------------------------------------------------------------
    # spot_prices
    # -------------------------------------------------------------------------
    op.create_table(
        "spot_prices",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("open", sa.Numeric(12, 4), nullable=True),
        sa.Column("high", sa.Numeric(12, 4), nullable=True),
        sa.Column("low", sa.Numeric(12, 4), nullable=True),
        sa.Column("close", sa.Numeric(12, 4), nullable=False),
        sa.Column("volume", sa.BigInteger, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("date", "symbol", name="uq_spot_date_symbol"),
    )
    op.create_index("ix_spot_symbol_date", "spot_prices", ["symbol", "date"])

    # -------------------------------------------------------------------------
    # india_vix
    # -------------------------------------------------------------------------
    op.create_table(
        "india_vix",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("date", sa.Date, nullable=False, unique=True),
        sa.Column("open", sa.Numeric(8, 4), nullable=True),
        sa.Column("high", sa.Numeric(8, 4), nullable=True),
        sa.Column("low", sa.Numeric(8, 4), nullable=True),
        sa.Column("close", sa.Numeric(8, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_vix_date", "india_vix", ["date"])

    # -------------------------------------------------------------------------
    # fno_universe
    # -------------------------------------------------------------------------
    op.create_table(
        "fno_universe",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("symbol", sa.String(30), nullable=False, unique=True),
        sa.Column("instrument_type", sa.String(10), nullable=False),  # index | stock
        sa.Column("lot_size", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # -------------------------------------------------------------------------
    # expiries
    # -------------------------------------------------------------------------
    op.create_table(
        "expiries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("expiry_date", sa.Date, nullable=False),
        sa.Column("expiry_type", sa.String(10), nullable=False),  # weekly | monthly
        sa.Column("is_holiday", sa.Boolean, default=False),
        sa.Column("actual_date", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("symbol", "expiry_date", name="uq_expiry_symbol_date"),
    )
    op.create_index("ix_expiry_symbol_date", "expiries", ["symbol", "expiry_date"])
    op.create_index("ix_expiry_type", "expiries", ["expiry_type"])

    # -------------------------------------------------------------------------
    # option_chain
    # -------------------------------------------------------------------------
    op.create_table(
        "option_chain",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("trade_date", sa.Date, nullable=False),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("expiry", sa.Date, nullable=False),
        sa.Column("expiry_type", sa.String(10), nullable=True),
        sa.Column("strike", sa.Numeric(12, 2), nullable=False),
        sa.Column("option_type", sa.String(2), nullable=False),  # CE | PE
        sa.Column("open", sa.Numeric(12, 4), nullable=True),
        sa.Column("high", sa.Numeric(12, 4), nullable=True),
        sa.Column("low", sa.Numeric(12, 4), nullable=True),
        sa.Column("close", sa.Numeric(12, 4), nullable=True),
        sa.Column("settle_price", sa.Numeric(12, 4), nullable=True),
        sa.Column("volume", sa.Integer, nullable=True),
        sa.Column("oi", sa.BigInteger, nullable=True),
        sa.Column("change_oi", sa.BigInteger, nullable=True),
        sa.Column("implied_volatility", sa.Numeric(10, 4), nullable=True),
        sa.Column("underlying_price", sa.Numeric(12, 4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "trade_date", "symbol", "expiry", "strike", "option_type",
            name="uq_oc_trade_symbol_expiry_strike_type"
        ),
    )
    op.create_index("ix_oc_symbol_date", "option_chain", ["symbol", "trade_date"])
    op.create_index("ix_oc_symbol_expiry", "option_chain", ["symbol", "expiry"])
    op.create_index("ix_oc_trade_date", "option_chain", ["trade_date"])

    # -------------------------------------------------------------------------
    # strategy_results
    # -------------------------------------------------------------------------
    op.create_table(
        "strategy_results",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("expiry", sa.Date, nullable=False),
        sa.Column("expiry_type", sa.String(10), nullable=True),
        sa.Column("ce_pct", sa.Numeric(6, 2), nullable=False),
        sa.Column("pe_pct", sa.Numeric(6, 2), nullable=False),
        sa.Column("ce_strike", sa.Numeric(12, 2), nullable=True),
        sa.Column("pe_strike", sa.Numeric(12, 2), nullable=True),
        sa.Column("spot_at_entry", sa.Numeric(12, 4), nullable=True),
        sa.Column("spot_at_expiry", sa.Numeric(12, 4), nullable=True),
        sa.Column("ce_entry_premium", sa.Numeric(10, 4), nullable=True),
        sa.Column("pe_entry_premium", sa.Numeric(10, 4), nullable=True),
        sa.Column("ce_expiry_premium", sa.Numeric(10, 4), nullable=True),
        sa.Column("pe_expiry_premium", sa.Numeric(10, 4), nullable=True),
        sa.Column("ce_pnl", sa.Numeric(12, 4), nullable=True),
        sa.Column("pe_pnl", sa.Numeric(12, 4), nullable=True),
        sa.Column("total_pnl", sa.Numeric(12, 4), nullable=True),
        sa.Column("return_pct", sa.Numeric(10, 4), nullable=True),
        sa.Column("ce_expired_worthless", sa.Boolean, nullable=True),
        sa.Column("pe_expired_worthless", sa.Boolean, nullable=True),
        sa.Column("vix_at_entry", sa.Numeric(8, 4), nullable=True),
        sa.Column("market_regime", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "symbol", "expiry", "ce_pct", "pe_pct",
            name="uq_sr_symbol_expiry_pcts"
        ),
    )
    op.create_index("ix_sr_symbol_expiry", "strategy_results", ["symbol", "expiry"])
    op.create_index("ix_sr_symbol", "strategy_results", ["symbol"])

    # -------------------------------------------------------------------------
    # optimal_selling_bands
    # -------------------------------------------------------------------------
    op.create_table(
        "optimal_selling_bands",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("instrument_type", sa.String(10), nullable=False),
        sa.Column("expiry_type", sa.String(10), nullable=False),
        sa.Column("analysis_period", sa.String(10), nullable=False),
        sa.Column("recommended_ce_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("recommended_pe_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("ce_win_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("pe_win_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("combined_win_rate", sa.Numeric(6, 4), nullable=True),
        sa.Column("avg_profit", sa.Numeric(12, 4), nullable=True),
        sa.Column("avg_loss", sa.Numeric(12, 4), nullable=True),
        sa.Column("expected_value", sa.Numeric(12, 4), nullable=True),
        sa.Column("sharpe_ratio", sa.Numeric(10, 4), nullable=True),
        sa.Column("sortino_ratio", sa.Numeric(10, 4), nullable=True),
        sa.Column("calmar_ratio", sa.Numeric(10, 4), nullable=True),
        sa.Column("max_drawdown", sa.Numeric(10, 4), nullable=True),
        sa.Column("profit_factor", sa.Numeric(10, 4), nullable=True),
        sa.Column("kelly_criterion", sa.Numeric(10, 4), nullable=True),
        sa.Column("probability_expire_worthless", sa.Numeric(6, 4), nullable=True),
        sa.Column("vix_regime", sa.String(10), nullable=True),
        sa.Column("market_regime", sa.String(20), nullable=True),
        sa.Column("optimization_mode", sa.String(20), nullable=False),
        sa.Column("total_expiries", sa.Integer, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_osb_symbol_expiry_type", "optimal_selling_bands", ["symbol", "expiry_type"])

    # -------------------------------------------------------------------------
    # daily_recommendations
    # -------------------------------------------------------------------------
    op.create_table(
        "daily_recommendations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("instrument_type", sa.String(10), nullable=False),
        sa.Column("expiry_type", sa.String(10), nullable=False),
        sa.Column("spot_price", sa.Numeric(12, 4), nullable=True),
        sa.Column("recommended_ce_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("recommended_pe_pct", sa.Numeric(6, 2), nullable=True),
        sa.Column("recommended_ce_strike", sa.Numeric(12, 2), nullable=True),
        sa.Column("recommended_pe_strike", sa.Numeric(12, 2), nullable=True),
        sa.Column("ce_probability", sa.Numeric(6, 4), nullable=True),
        sa.Column("pe_probability", sa.Numeric(6, 4), nullable=True),
        sa.Column("combined_probability", sa.Numeric(6, 4), nullable=True),
        sa.Column("expected_return", sa.Numeric(10, 4), nullable=True),
        sa.Column("risk_score", sa.Numeric(6, 4), nullable=True),
        sa.Column("vix_at_recommendation", sa.Numeric(8, 4), nullable=True),
        sa.Column("market_regime", sa.String(20), nullable=True),
        sa.Column("alert_generated", sa.Boolean, default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("date", "symbol", "expiry_type", name="uq_dr_date_symbol_expiry"),
    )
    op.create_index("ix_dr_date", "daily_recommendations", ["date"])
    op.create_index("ix_dr_date_symbol", "daily_recommendations", ["date", "symbol"])

    # -------------------------------------------------------------------------
    # users
    # -------------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("is_superuser", sa.Boolean, default=False),
        sa.Column("tier", sa.String(20), default="free"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # -------------------------------------------------------------------------
    # chat_history
    # -------------------------------------------------------------------------
    op.create_table(
        "chat_history",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("sql_query", sa.Text, nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_chat_session", "chat_history", ["session_id"])

    # -------------------------------------------------------------------------
    # alerts
    # -------------------------------------------------------------------------
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("symbol", sa.String(30), nullable=False),
        sa.Column("alert_type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("channel", sa.String(20), nullable=False, default="in_app"),
        sa.Column("is_sent", sa.Boolean, default=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Seed F&O universe with default symbols
    op.execute("""
        INSERT INTO fno_universe (symbol, instrument_type, lot_size, is_active) VALUES
        ('NIFTY', 'index', 75, true),
        ('BANKNIFTY', 'index', 30, true),
        ('FINNIFTY', 'index', 65, true),
        ('MIDCPNIFTY', 'index', 120, true),
        ('NIFTYNXT50', 'index', 25, true),
        ('RELIANCE', 'stock', 250, true),
        ('HDFCBANK', 'stock', 550, true),
        ('TCS', 'stock', 150, true),
        ('INFY', 'stock', 300, true),
        ('ICICIBANK', 'stock', 700, true),
        ('SBIN', 'stock', 1500, true),
        ('BHARTIARTL', 'stock', 500, true),
        ('WIPRO', 'stock', 1500, true),
        ('TATAMOTORS', 'stock', 1400, true),
        ('KOTAKBANK', 'stock', 400, true),
        ('AXISBANK', 'stock', 625, true),
        ('LT', 'stock', 175, true),
        ('NTPC', 'stock', 3000, true),
        ('POWERGRID', 'stock', 2700, true),
        ('SUNPHARMA', 'stock', 350, true)
        ON CONFLICT (symbol) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_table("chat_history")
    op.drop_table("users")
    op.drop_table("daily_recommendations")
    op.drop_table("optimal_selling_bands")
    op.drop_table("strategy_results")
    op.drop_table("option_chain")
    op.drop_table("expiries")
    op.drop_table("fno_universe")
    op.drop_table("india_vix")
    op.drop_table("spot_prices")
