"""
Dashboard API endpoints — overview metrics and recommendation summaries.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.models import DailyRecommendation, OptimalSellingBand, IndiaVIX, SpotPrice

router = APIRouter()


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """Get dashboard overview with summary metrics."""
    # Get latest VIX
    vix_query = select(IndiaVIX).order_by(desc(IndiaVIX.date)).limit(1)
    vix_result = await db.execute(vix_query)
    latest_vix = vix_result.scalar_one_or_none()

    # Count total symbols tracked
    symbol_count = await db.execute(
        select(func.count(func.distinct(DailyRecommendation.symbol)))
    )

    # Get latest recommendations count
    latest_date_q = select(func.max(DailyRecommendation.date))
    latest_date_result = await db.execute(latest_date_q)
    latest_date = latest_date_result.scalar()

    rec_count = 0
    if latest_date:
        rec_count_q = select(func.count()).where(DailyRecommendation.date == latest_date)
        rec_count_result = await db.execute(rec_count_q)
        rec_count = rec_count_result.scalar() or 0

    return {
        "latest_vix": float(latest_vix.close) if latest_vix else None,
        "vix_date": str(latest_vix.date) if latest_vix else None,
        "symbols_tracked": symbol_count.scalar() or 0,
        "latest_recommendations": rec_count,
        "latest_date": str(latest_date) if latest_date else None,
    }


@router.get("/weekly-index")
async def get_weekly_index_recommendations(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, le=100),
):
    """Get weekly index option selling recommendations for the latest date."""
    # Get latest date with weekly index recommendations
    latest_date_q = select(func.max(DailyRecommendation.date)).where(
        DailyRecommendation.instrument_type == "index",
        DailyRecommendation.expiry_type == "weekly",
    )
    latest_date_result = await db.execute(latest_date_q)
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return []

    query = (
        select(DailyRecommendation)
        .where(
            DailyRecommendation.instrument_type == "index",
            DailyRecommendation.expiry_type == "weekly",
            DailyRecommendation.date == latest_date,
        )
        .order_by(desc(DailyRecommendation.expected_return))
        .limit(limit)
    )
    result = await db.execute(query)
    recommendations = result.scalars().all()

    return [
        {
            "date": str(r.date),
            "symbol": r.symbol,
            "spot_price": float(r.spot_price) if r.spot_price else None,
            "recommended_ce_pct": float(r.recommended_ce_pct) if r.recommended_ce_pct else None,
            "recommended_pe_pct": float(r.recommended_pe_pct) if r.recommended_pe_pct else None,
            "recommended_ce_strike": float(r.recommended_ce_strike) if r.recommended_ce_strike else None,
            "recommended_pe_strike": float(r.recommended_pe_strike) if r.recommended_pe_strike else None,
            "ce_probability": float(r.ce_probability) if r.ce_probability else None,
            "pe_probability": float(r.pe_probability) if r.pe_probability else None,
            "combined_probability": float(r.combined_probability) if r.combined_probability else None,
            "expected_return": float(r.expected_return) if r.expected_return else None,
            "risk_score": float(r.risk_score) if r.risk_score else None,
            "market_regime": r.market_regime,
        }
        for r in recommendations
    ]


@router.get("/monthly-index")
async def get_monthly_index_recommendations(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, le=100),
):
    """Get monthly index option selling recommendations for the latest date."""
    # Get latest date with monthly index recommendations
    latest_date_q = select(func.max(DailyRecommendation.date)).where(
        DailyRecommendation.instrument_type == "index",
        DailyRecommendation.expiry_type == "monthly",
    )
    latest_date_result = await db.execute(latest_date_q)
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return []

    query = (
        select(DailyRecommendation)
        .where(
            DailyRecommendation.instrument_type == "index",
            DailyRecommendation.expiry_type == "monthly",
            DailyRecommendation.date == latest_date,
        )
        .order_by(desc(DailyRecommendation.expected_return))
        .limit(limit)
    )
    result = await db.execute(query)
    recommendations = result.scalars().all()

    return [
        {
            "date": str(r.date),
            "symbol": r.symbol,
            "spot_price": float(r.spot_price) if r.spot_price else None,
            "recommended_ce_pct": float(r.recommended_ce_pct) if r.recommended_ce_pct else None,
            "recommended_pe_pct": float(r.recommended_pe_pct) if r.recommended_pe_pct else None,
            "recommended_ce_strike": float(r.recommended_ce_strike) if r.recommended_ce_strike else None,
            "recommended_pe_strike": float(r.recommended_pe_strike) if r.recommended_pe_strike else None,
            "combined_probability": float(r.combined_probability) if r.combined_probability else None,
            "expected_return": float(r.expected_return) if r.expected_return else None,
            "risk_score": float(r.risk_score) if r.risk_score else None,
            "market_regime": r.market_regime,
        }
        for r in recommendations
    ]


@router.get("/stocks")
async def get_stock_recommendations(
    db: AsyncSession = Depends(get_db),
    sort_by: str = Query(default="expected_return", enum=["expected_return", "combined_probability", "risk_score"]),
    limit: int = Query(default=200, le=1000),
):
    """Get stock monthly option selling recommendations, ranked."""
    order_col = {
        "expected_return": desc(DailyRecommendation.expected_return),
        "combined_probability": desc(DailyRecommendation.combined_probability),
        "risk_score": DailyRecommendation.risk_score,  # ascending (lower = better)
    }[sort_by]

    # Get latest date
    latest_date_q = select(func.max(DailyRecommendation.date)).where(
        DailyRecommendation.instrument_type == "stock"
    )
    latest_date_result = await db.execute(latest_date_q)
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return []

    query = (
        select(DailyRecommendation)
        .where(
            DailyRecommendation.instrument_type == "stock",
            DailyRecommendation.expiry_type == "monthly",
            DailyRecommendation.date == latest_date,
        )
        .order_by(order_col)
        .limit(limit)
    )
    result = await db.execute(query)
    recommendations = result.scalars().all()

    return [
        {
            "rank": idx + 1,
            "date": str(r.date),
            "symbol": r.symbol,
            "spot_price": float(r.spot_price) if r.spot_price else None,
            "recommended_ce_pct": float(r.recommended_ce_pct) if r.recommended_ce_pct else None,
            "recommended_pe_pct": float(r.recommended_pe_pct) if r.recommended_pe_pct else None,
            "recommended_ce_strike": float(r.recommended_ce_strike) if r.recommended_ce_strike else None,
            "recommended_pe_strike": float(r.recommended_pe_strike) if r.recommended_pe_strike else None,
            "combined_probability": float(r.combined_probability) if r.combined_probability else None,
            "expected_return": float(r.expected_return) if r.expected_return else None,
            "risk_score": float(r.risk_score) if r.risk_score else None,
            "market_regime": r.market_regime,
        }
        for idx, r in enumerate(recommendations)
    ]
