"""
Pydantic schemas for API request/response validation.
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


# =============================================================================
# Spot Price Schemas
# =============================================================================

class SpotPriceResponse(BaseModel):
    date: date
    symbol: str
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: float
    volume: Optional[int] = None


# =============================================================================
# Recommendation Schemas
# =============================================================================

class RecommendationResponse(BaseModel):
    date: date
    symbol: str
    instrument_type: str
    expiry_type: str
    spot_price: Optional[float] = None
    recommended_ce_pct: Optional[float] = None
    recommended_pe_pct: Optional[float] = None
    recommended_ce_strike: Optional[float] = None
    recommended_pe_strike: Optional[float] = None
    ce_probability: Optional[float] = None
    pe_probability: Optional[float] = None
    combined_probability: Optional[float] = None
    expected_return: Optional[float] = None
    risk_score: Optional[float] = None
    vix: Optional[float] = None
    market_regime: Optional[str] = None


class RecommendationListResponse(BaseModel):
    date: Optional[date] = None
    count: int
    recommendations: list[RecommendationResponse]


# =============================================================================
# Analytics Schemas
# =============================================================================

class HeatmapCell(BaseModel):
    ce_pct: Optional[float] = None
    pe_pct: Optional[float] = None
    value: Optional[float] = None
    analysis_period: str


class HeatmapResponse(BaseModel):
    symbol: str
    expiry_type: str
    metric: str
    data: list[HeatmapCell]


class StrategyResultResponse(BaseModel):
    expiry: date
    ce_pct: float
    pe_pct: float
    ce_strike: Optional[float] = None
    pe_strike: Optional[float] = None
    spot_at_entry: Optional[float] = None
    spot_at_expiry: Optional[float] = None
    ce_entry_premium: Optional[float] = None
    pe_entry_premium: Optional[float] = None
    ce_expiry_premium: Optional[float] = None
    pe_expiry_premium: Optional[float] = None
    ce_pnl: Optional[float] = None
    pe_pnl: Optional[float] = None
    total_pnl: Optional[float] = None
    return_pct: Optional[float] = None
    ce_expired_worthless: Optional[bool] = None
    pe_expired_worthless: Optional[bool] = None
    market_regime: Optional[str] = None


class OptimalBandResponse(BaseModel):
    symbol: str
    instrument_type: str
    expiry_type: str
    analysis_period: str
    recommended_ce_pct: Optional[float] = None
    recommended_pe_pct: Optional[float] = None
    combined_win_rate: Optional[float] = None
    expected_value: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    probability_expire_worthless: Optional[float] = None
    vix_regime: Optional[str] = None
    market_regime: Optional[str] = None
    optimization_mode: str


# =============================================================================
# Scanner Schemas
# =============================================================================

class OpportunityResponse(BaseModel):
    rank: int
    symbol: str
    instrument_type: str
    expiry_type: str
    spot_price: Optional[float] = None
    recommended_ce_pct: Optional[float] = None
    recommended_pe_pct: Optional[float] = None
    recommended_ce_strike: Optional[float] = None
    recommended_pe_strike: Optional[float] = None
    combined_probability: Optional[float] = None
    expected_return: Optional[float] = None
    risk_score: Optional[float] = None
    vix: Optional[float] = None
    market_regime: Optional[str] = None


# =============================================================================
# Dashboard Overview
# =============================================================================

class DashboardOverviewResponse(BaseModel):
    latest_vix: Optional[float] = None
    vix_date: Optional[str] = None
    symbols_tracked: int = 0
    latest_recommendations: int = 0
    latest_date: Optional[str] = None
    market_regime: Optional[str] = None
    total_expiries_analyzed: int = 0
