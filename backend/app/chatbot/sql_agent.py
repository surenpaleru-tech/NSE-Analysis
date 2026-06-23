"""
SQL Agent — safe, read-only SQL generation for the chatbot.
Generates SQL queries from natural language, validates them, and returns results.
"""

import re
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.logging import get_logger
from app.chatbot.llm_provider import get_llm_provider

logger = get_logger(__name__)

# Allowed tables for SQL agent (read-only)
ALLOWED_TABLES = {
    "spot_prices", "option_chain", "expiries", "india_vix",
    "fno_universe", "optimal_selling_bands", "daily_recommendations",
    "strategy_results",
}

# Forbidden SQL patterns
FORBIDDEN_PATTERNS = [
    r"\bDELETE\b", r"\bDROP\b", r"\bINSERT\b", r"\bUPDATE\b",
    r"\bALTER\b", r"\bTRUNCATE\b", r"\bCREATE\b", r"\bGRANT\b",
    r"\bREVOKE\b", r"\bEXECUTE\b", r"\bEXEC\b",
]

SCHEMA_DESCRIPTION = """
Available tables and their key columns:

1. spot_prices: date, symbol, open, high, low, close, volume
2. option_chain: trade_date, symbol, expiry, expiry_type(weekly/monthly), strike, option_type(CE/PE), open, high, low, close, volume, oi, change_oi, implied_volatility, underlying_price
3. expiries: symbol, expiry_date, expiry_type, is_holiday, actual_date
4. india_vix: date, open, high, low, close
5. fno_universe: symbol, instrument_type(index/stock), lot_size, is_active
6. optimal_selling_bands: symbol, instrument_type, expiry_type, analysis_period, recommended_ce_pct, recommended_pe_pct, ce_win_rate, pe_win_rate, combined_win_rate, avg_profit, avg_loss, expected_value, sharpe_ratio, sortino_ratio, calmar_ratio, max_drawdown, profit_factor, kelly_criterion, probability_expire_worthless, vix_regime, market_regime, optimization_mode
7. daily_recommendations: date, symbol, instrument_type, expiry_type, spot_price, recommended_ce_pct, recommended_pe_pct, recommended_ce_strike, recommended_pe_strike, ce_probability, pe_probability, combined_probability, expected_return, risk_score, vix_at_recommendation, market_regime
8. strategy_results: symbol, expiry, expiry_type, ce_pct, pe_pct, ce_strike, pe_strike, spot_at_entry, spot_at_expiry, ce_entry_premium, pe_entry_premium, ce_expiry_premium, pe_expiry_premium, ce_pnl, pe_pnl, total_pnl, ce_expired_worthless, pe_expired_worthless, return_pct, vix_at_entry, market_regime
"""

SQL_SYSTEM_PROMPT = f"""You are a SQL expert for the NSE Options Intelligence Platform.
Generate PostgreSQL queries to answer user questions about Indian stock market derivatives data.

RULES:
- Generate ONLY SELECT queries. Never use INSERT, UPDATE, DELETE, DROP, ALTER, or any destructive SQL.
- Always limit results to at most 100 rows using LIMIT.
- Use proper table and column names from the schema below.
- When asked about "best" or "optimal" bands, query optimal_selling_bands.
- When asked about today's recommendations, query daily_recommendations.
- When asked about historical performance, query strategy_results.
- Format monetary values to 2 decimal places.
- Return ONLY the SQL query, no explanation.

{SCHEMA_DESCRIPTION}
"""


class SQLAgent:
    """Safe SQL generation and execution agent."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_llm_provider()

    async def generate_and_execute(self, question: str) -> dict:
        """
        Generate SQL from natural language, validate, execute, and return results.

        Returns:
            {
                "sql": str,          # Generated SQL
                "results": list,     # Query results
                "columns": list,     # Column names
                "error": str | None  # Error message if any
            }
        """
        try:
            # Generate SQL
            sql = await self._generate_sql(question)

            # Validate SQL
            is_valid, error = self._validate_sql(sql)
            if not is_valid:
                return {"sql": sql, "results": [], "columns": [], "error": error}

            # Execute query
            results, columns = await self._execute_sql(sql)

            return {
                "sql": sql,
                "results": results,
                "columns": columns,
                "error": None,
            }

        except Exception as e:
            logger.error(f"SQL Agent error: {e}")
            return {
                "sql": "",
                "results": [],
                "columns": [],
                "error": str(e),
            }

    async def _generate_sql(self, question: str) -> str:
        """Generate SQL from natural language using LLM."""
        prompt = f"User question: {question}\n\nGenerate a PostgreSQL SELECT query to answer this question."
        response = await self.llm.generate(prompt, system_prompt=SQL_SYSTEM_PROMPT)

        # Extract SQL from response (handle code blocks)
        sql = response.strip()
        if "```sql" in sql:
            sql = sql.split("```sql")[1].split("```")[0].strip()
        elif "```" in sql:
            sql = sql.split("```")[1].split("```")[0].strip()

        return sql

    def _validate_sql(self, sql: str) -> tuple[bool, Optional[str]]:
        """Validate SQL for safety — only allow SELECT queries."""
        if not sql:
            return False, "Empty SQL query"

        sql_upper = sql.upper().strip()

        # Must start with SELECT or WITH (CTE)
        if not sql_upper.startswith("SELECT") and not sql_upper.startswith("WITH"):
            return False, "Only SELECT queries are allowed"

        # Check for forbidden patterns
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, sql_upper):
                return False, f"Forbidden SQL operation detected"

        # Check for semicolons (prevent multi-statement injection)
        if ";" in sql and sql.strip().rstrip(";").count(";") > 0:
            return False, "Multiple statements not allowed"

        # Ensure LIMIT is present (add if missing)
        if "LIMIT" not in sql_upper:
            sql = sql.rstrip(";") + " LIMIT 100"

        return True, None

    async def _execute_sql(self, sql: str) -> tuple[list[list], list[str]]:
        """Execute a validated SQL query."""
        result = await self.db.execute(text(sql))
        columns = list(result.keys())
        rows = []

        for row in result.fetchall():
            rows.append([
                str(v) if v is not None else None
                for v in row
            ])

        return rows, columns
