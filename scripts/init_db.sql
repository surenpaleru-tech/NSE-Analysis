-- =============================================================================
-- NSE Options Probability Intelligence Platform
-- Database Initialization Script
-- =============================================================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Core Data Tables
-- =============================================================================

-- Spot prices (daily OHLCV)
CREATE TABLE IF NOT EXISTS spot_prices (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    symbol          VARCHAR(50) NOT NULL,
    open            DECIMAL(12,2),
    high            DECIMAL(12,2),
    low             DECIMAL(12,2),
    close           DECIMAL(12,2) NOT NULL,
    volume          BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, symbol)
);
CREATE INDEX IF NOT EXISTS idx_spot_symbol_date ON spot_prices(symbol, date DESC);

-- Option chain (complete derivatives data)
CREATE TABLE IF NOT EXISTS option_chain (
    id                  BIGSERIAL PRIMARY KEY,
    trade_date          DATE NOT NULL,
    symbol              VARCHAR(50) NOT NULL,
    expiry              DATE NOT NULL,
    expiry_type         VARCHAR(10) NOT NULL CHECK (expiry_type IN ('weekly', 'monthly')),
    strike              DECIMAL(12,2) NOT NULL,
    option_type         VARCHAR(2) NOT NULL CHECK (option_type IN ('CE', 'PE')),
    open                DECIMAL(12,2),
    high                DECIMAL(12,2),
    low                 DECIMAL(12,2),
    close               DECIMAL(12,2),
    volume              BIGINT,
    oi                  BIGINT,
    change_oi           BIGINT,
    implied_volatility  DECIMAL(8,4),
    underlying_price    DECIMAL(12,2),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trade_date, symbol, expiry, strike, option_type)
);
CREATE INDEX IF NOT EXISTS idx_oc_symbol_expiry ON option_chain(symbol, expiry, trade_date);
CREATE INDEX IF NOT EXISTS idx_oc_trade_date ON option_chain(trade_date);
CREATE INDEX IF NOT EXISTS idx_oc_symbol_type ON option_chain(symbol, option_type, expiry_type);
CREATE INDEX IF NOT EXISTS idx_oc_expiry_type ON option_chain(expiry_type);

-- Expiry calendar
CREATE TABLE IF NOT EXISTS expiries (
    id          SERIAL PRIMARY KEY,
    symbol      VARCHAR(50) NOT NULL,
    expiry_date DATE NOT NULL,
    expiry_type VARCHAR(10) NOT NULL CHECK (expiry_type IN ('weekly', 'monthly')),
    is_holiday  BOOLEAN DEFAULT FALSE,
    actual_date DATE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, expiry_date, expiry_type)
);
CREATE INDEX IF NOT EXISTS idx_expiries_symbol ON expiries(symbol, expiry_date);

-- India VIX
CREATE TABLE IF NOT EXISTS india_vix (
    id         SERIAL PRIMARY KEY,
    date       DATE NOT NULL UNIQUE,
    open       DECIMAL(8,4),
    high       DECIMAL(8,4),
    low        DECIMAL(8,4),
    close      DECIMAL(8,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F&O stock universe
CREATE TABLE IF NOT EXISTS fno_universe (
    id              SERIAL PRIMARY KEY,
    symbol          VARCHAR(50) NOT NULL,
    instrument_type VARCHAR(10) NOT NULL CHECK (instrument_type IN ('index', 'stock')),
    lot_size        INTEGER,
    is_active       BOOLEAN DEFAULT TRUE,
    added_date      DATE,
    removed_date    DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, instrument_type)
);

-- =============================================================================
-- Analytics Tables
-- =============================================================================

-- Strategy results (historical P&L for every CE/PE combination)
CREATE TABLE IF NOT EXISTS strategy_results (
    id                  BIGSERIAL PRIMARY KEY,
    symbol              VARCHAR(50) NOT NULL,
    expiry              DATE NOT NULL,
    expiry_type         VARCHAR(10) NOT NULL CHECK (expiry_type IN ('weekly', 'monthly')),
    ce_pct              DECIMAL(6,2) NOT NULL,
    pe_pct              DECIMAL(6,2) NOT NULL,
    ce_strike           DECIMAL(12,2),
    pe_strike           DECIMAL(12,2),
    spot_at_entry       DECIMAL(12,2),
    spot_at_expiry      DECIMAL(12,2),
    ce_entry_premium    DECIMAL(12,2),
    pe_entry_premium    DECIMAL(12,2),
    ce_expiry_premium   DECIMAL(12,2),
    pe_expiry_premium   DECIMAL(12,2),
    ce_pnl              DECIMAL(12,2),
    pe_pnl              DECIMAL(12,2),
    total_pnl           DECIMAL(12,2),
    ce_expired_worthless BOOLEAN,
    pe_expired_worthless BOOLEAN,
    return_pct          DECIMAL(8,4),
    vix_at_entry        DECIMAL(8,4),
    market_regime       VARCHAR(15),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, expiry, ce_pct, pe_pct)
);
CREATE INDEX IF NOT EXISTS idx_sr_symbol_expiry ON strategy_results(symbol, expiry_type);
CREATE INDEX IF NOT EXISTS idx_sr_regime ON strategy_results(market_regime, symbol);

-- Optimal selling bands (best CE/PE percentages)
CREATE TABLE IF NOT EXISTS optimal_selling_bands (
    id                              BIGSERIAL PRIMARY KEY,
    symbol                          VARCHAR(50) NOT NULL,
    instrument_type                 VARCHAR(10) NOT NULL CHECK (instrument_type IN ('index', 'stock')),
    expiry_type                     VARCHAR(10) NOT NULL CHECK (expiry_type IN ('weekly', 'monthly')),
    analysis_period                 VARCHAR(20) NOT NULL,
    recommended_ce_pct              DECIMAL(6,2),
    recommended_pe_pct              DECIMAL(6,2),
    ce_win_rate                     DECIMAL(6,4),
    pe_win_rate                     DECIMAL(6,4),
    combined_win_rate               DECIMAL(6,4),
    avg_profit                      DECIMAL(12,2),
    avg_loss                        DECIMAL(12,2),
    expected_value                  DECIMAL(12,2),
    sharpe_ratio                    DECIMAL(8,4),
    sortino_ratio                   DECIMAL(8,4),
    calmar_ratio                    DECIMAL(8,4),
    max_drawdown                    DECIMAL(8,4),
    profit_factor                   DECIMAL(8,4),
    kelly_criterion                 DECIMAL(8,4),
    probability_expire_worthless    DECIMAL(6,4),
    recommended_ce_strike_offset    DECIMAL(12,2),
    recommended_pe_strike_offset    DECIMAL(12,2),
    vix_regime                      VARCHAR(10),
    market_regime                   VARCHAR(15),
    optimization_mode               VARCHAR(20) NOT NULL DEFAULT 'expected_value',
    last_updated                    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_optimal_selling_bands_unique
ON optimal_selling_bands (
    symbol,
    instrument_type,
    expiry_type,
    analysis_period,
    COALESCE(vix_regime, ''),
    COALESCE(market_regime, ''),
    optimization_mode
);

-- Daily recommendations
CREATE TABLE IF NOT EXISTS daily_recommendations (
    id                      BIGSERIAL PRIMARY KEY,
    date                    DATE NOT NULL,
    symbol                  VARCHAR(50) NOT NULL,
    instrument_type         VARCHAR(10) NOT NULL,
    expiry_type             VARCHAR(10) NOT NULL,
    spot_price              DECIMAL(12,2),
    recommended_ce_pct      DECIMAL(6,2),
    recommended_pe_pct      DECIMAL(6,2),
    recommended_ce_strike   DECIMAL(12,2),
    recommended_pe_strike   DECIMAL(12,2),
    ce_probability          DECIMAL(6,4),
    pe_probability          DECIMAL(6,4),
    combined_probability    DECIMAL(6,4),
    expected_return         DECIMAL(8,4),
    risk_score              DECIMAL(6,4),
    vix_at_recommendation   DECIMAL(8,4),
    market_regime           VARCHAR(15),
    alert_generated         BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, symbol, expiry_type)
);
CREATE INDEX IF NOT EXISTS idx_dr_date ON daily_recommendations(date DESC);
CREATE INDEX IF NOT EXISTS idx_dr_symbol ON daily_recommendations(symbol, date DESC);

-- =============================================================================
-- User & Chat Tables
-- =============================================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    name            VARCHAR(100),
    tier            VARCHAR(10) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'admin')),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history
CREATE TABLE IF NOT EXISTS chat_history (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id  UUID NOT NULL DEFAULT uuid_generate_v4(),
    role        VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content     TEXT NOT NULL,
    sql_query   TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id, created_at DESC);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol          VARCHAR(50) NOT NULL,
    alert_type      VARCHAR(30) NOT NULL CHECK (alert_type IN (
        'daily_recommendation', 'threshold', 'regime_change', 'data_issue'
    )),
    title           VARCHAR(255),
    message         TEXT,
    channel         VARCHAR(20) CHECK (channel IN ('telegram', 'email', 'push', 'in_app')),
    is_sent         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unsent ON alerts(is_sent, created_at) WHERE is_sent = FALSE;

-- =============================================================================
-- Seed initial F&O universe (indices)
-- =============================================================================
INSERT INTO fno_universe (symbol, instrument_type, lot_size, is_active, added_date)
VALUES
    ('NIFTY', 'index', 25, true, '2000-06-12'),
    ('BANKNIFTY', 'index', 15, true, '2001-06-04'),
    ('FINNIFTY', 'index', 25, true, '2021-01-11'),
    ('MIDCPNIFTY', 'index', 50, true, '2022-10-24'),
    ('NIFTYNXT50', 'index', 25, true, '2023-04-10')
ON CONFLICT (symbol, instrument_type) DO NOTHING;

-- =============================================================================
-- Create read-only role for SQL agent
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nse_readonly') THEN
        CREATE ROLE nse_readonly LOGIN PASSWORD 'readonly_password';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE nse_intelligence TO nse_readonly;
GRANT USAGE ON SCHEMA public TO nse_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO nse_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO nse_readonly;
