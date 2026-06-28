"""Dashboard API endpoints for overview, recommendations, and new workspaces."""

from collections import Counter
from statistics import mean

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import DailyRecommendation, IndiaVIX
from app.services.projection_engine import (
    build_futures_outlook,
    build_options_projection_board,
)

router = APIRouter()


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """Get dashboard overview with summary metrics."""
    vix_query = select(IndiaVIX).order_by(desc(IndiaVIX.date)).limit(1)
    vix_result = await db.execute(vix_query)
    latest_vix = vix_result.scalar_one_or_none()

    symbol_count = await db.execute(
        select(func.count(func.distinct(DailyRecommendation.symbol)))
    )

    latest_date_result = await db.execute(select(func.max(DailyRecommendation.date)))
    latest_date = latest_date_result.scalar()

    rec_count = 0
    avg_probability = None
    avg_expected_return = None
    current_market_regime = None
    top_symbol = None

    if latest_date:
        rec_count_result = await db.execute(
            select(func.count()).where(DailyRecommendation.date == latest_date)
        )
        rec_count = rec_count_result.scalar() or 0

        latest_recs_result = await db.execute(
            select(DailyRecommendation).where(DailyRecommendation.date == latest_date)
        )
        latest_recs = latest_recs_result.scalars().all()

        probabilities = [
            float(rec.combined_probability)
            for rec in latest_recs
            if rec.combined_probability is not None
        ]
        expected_returns = [
            float(rec.expected_return)
            for rec in latest_recs
            if rec.expected_return is not None
        ]
        regimes = [rec.market_regime for rec in latest_recs if rec.market_regime]

        avg_probability = mean(probabilities) if probabilities else None
        avg_expected_return = mean(expected_returns) if expected_returns else None
        current_market_regime = Counter(regimes).most_common(1)[0][0] if regimes else None

        ranked = sorted(
            latest_recs,
            key=lambda rec: float(rec.expected_return or 0),
            reverse=True,
        )
        top_symbol = ranked[0].symbol if ranked else None

    return {
        "latest_vix": float(latest_vix.close) if latest_vix else None,
        "vix_date": str(latest_vix.date) if latest_vix else None,
        "symbols_tracked": symbol_count.scalar() or 0,
        "latest_recommendations": rec_count,
        "latest_date": str(latest_date) if latest_date else None,
        "avg_probability": round(avg_probability, 4) if avg_probability is not None else None,
        "avg_expected_return": round(avg_expected_return, 2)
        if avg_expected_return is not None
        else None,
        "current_market_regime": current_market_regime,
        "top_symbol": top_symbol,
    }


@router.get("/weekly-index")
async def get_weekly_index_recommendations(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, le=100),
):
    """Get weekly index option selling recommendations for the latest date."""
    latest_date_result = await db.execute(
        select(func.max(DailyRecommendation.date)).where(
            DailyRecommendation.instrument_type == "index",
            DailyRecommendation.expiry_type == "weekly",
        )
    )
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return []

    result = await db.execute(
        select(DailyRecommendation)
        .where(
            DailyRecommendation.instrument_type == "index",
            DailyRecommendation.expiry_type == "weekly",
            DailyRecommendation.date == latest_date,
        )
        .order_by(desc(DailyRecommendation.expected_return))
        .limit(limit)
    )
    recommendations = result.scalars().all()

    return [
        {
            "date": str(r.date),
            "symbol": r.symbol,
            "spot_price": float(r.spot_price) if r.spot_price else None,
            "recommended_ce_pct": float(r.recommended_ce_pct)
            if r.recommended_ce_pct
            else None,
            "recommended_pe_pct": float(r.recommended_pe_pct)
            if r.recommended_pe_pct
            else None,
            "recommended_ce_strike": float(r.recommended_ce_strike)
            if r.recommended_ce_strike
            else None,
            "recommended_pe_strike": float(r.recommended_pe_strike)
            if r.recommended_pe_strike
            else None,
            "ce_probability": float(r.ce_probability) if r.ce_probability else None,
            "pe_probability": float(r.pe_probability) if r.pe_probability else None,
            "combined_probability": float(r.combined_probability)
            if r.combined_probability
            else None,
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
    latest_date_result = await db.execute(
        select(func.max(DailyRecommendation.date)).where(
            DailyRecommendation.instrument_type == "index",
            DailyRecommendation.expiry_type == "monthly",
        )
    )
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return []

    result = await db.execute(
        select(DailyRecommendation)
        .where(
            DailyRecommendation.instrument_type == "index",
            DailyRecommendation.expiry_type == "monthly",
            DailyRecommendation.date == latest_date,
        )
        .order_by(desc(DailyRecommendation.expected_return))
        .limit(limit)
    )
    recommendations = result.scalars().all()

    return [
        {
            "date": str(r.date),
            "symbol": r.symbol,
            "spot_price": float(r.spot_price) if r.spot_price else None,
            "recommended_ce_pct": float(r.recommended_ce_pct)
            if r.recommended_ce_pct
            else None,
            "recommended_pe_pct": float(r.recommended_pe_pct)
            if r.recommended_pe_pct
            else None,
            "recommended_ce_strike": float(r.recommended_ce_strike)
            if r.recommended_ce_strike
            else None,
            "recommended_pe_strike": float(r.recommended_pe_strike)
            if r.recommended_pe_strike
            else None,
            "combined_probability": float(r.combined_probability)
            if r.combined_probability
            else None,
            "expected_return": float(r.expected_return) if r.expected_return else None,
            "risk_score": float(r.risk_score) if r.risk_score else None,
            "market_regime": r.market_regime,
        }
        for r in recommendations
    ]


@router.get("/stocks")
async def get_stock_recommendations(
    db: AsyncSession = Depends(get_db),
    sort_by: str = Query(
        default="expected_return",
        enum=["expected_return", "combined_probability", "risk_score"],
    ),
    limit: int = Query(default=200, le=1000),
):
    """Get stock monthly option selling recommendations, ranked."""
    order_col = {
        "expected_return": desc(DailyRecommendation.expected_return),
        "combined_probability": desc(DailyRecommendation.combined_probability),
        "risk_score": DailyRecommendation.risk_score,
    }[sort_by]

    latest_date_result = await db.execute(
        select(func.max(DailyRecommendation.date)).where(
            DailyRecommendation.instrument_type == "stock"
        )
    )
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return []

    result = await db.execute(
        select(DailyRecommendation)
        .where(
            DailyRecommendation.instrument_type == "stock",
            DailyRecommendation.expiry_type == "monthly",
            DailyRecommendation.date == latest_date,
        )
        .order_by(order_col)
        .limit(limit)
    )
    recommendations = result.scalars().all()

    return [
        {
            "rank": idx + 1,
            "date": str(r.date),
            "symbol": r.symbol,
            "spot_price": float(r.spot_price) if r.spot_price else None,
            "recommended_ce_pct": float(r.recommended_ce_pct)
            if r.recommended_ce_pct
            else None,
            "recommended_pe_pct": float(r.recommended_pe_pct)
            if r.recommended_pe_pct
            else None,
            "recommended_ce_strike": float(r.recommended_ce_strike)
            if r.recommended_ce_strike
            else None,
            "recommended_pe_strike": float(r.recommended_pe_strike)
            if r.recommended_pe_strike
            else None,
            "combined_probability": float(r.combined_probability)
            if r.combined_probability
            else None,
            "expected_return": float(r.expected_return) if r.expected_return else None,
            "risk_score": float(r.risk_score) if r.risk_score else None,
            "market_regime": r.market_regime,
        }
        for idx, r in enumerate(recommendations)
    ]


@router.get("/projection-board")
async def get_projection_board(
    db: AsyncSession = Depends(get_db),
    instrument_type: str | None = Query(default=None, enum=["index", "stock"]),
    expiry_type: str = Query(default="monthly", enum=["weekly", "monthly"]),
    analysis_period: str = Query(default="1y", enum=["3m", "6m", "1y", "2y", "all"]),
    optimization_mode: str = Query(
        default="expected_value",
        enum=["expected_value", "win_rate", "sharpe_ratio", "min_drawdown"],
    ),
    sort_by: str = Query(
        default="projection_score",
        enum=[
            "projection_score",
            "combined_probability",
            "expected_value_pct",
            "sharpe_ratio",
            "trade_count",
        ],
    ),
    search: str | None = Query(default=None),
    limit: int = Query(default=250, le=1000),
):
    """Get a filtered options projection board built from optimal band history."""
    return await build_options_projection_board(
        db,
        instrument_type=instrument_type,
        expiry_type=expiry_type,
        analysis_period=analysis_period,
        optimization_mode=optimization_mode,
        sort_by=sort_by,
        search=search,
        limit=limit,
    )


@router.get("/futures-outlook")
async def get_futures_outlook_board(
    db: AsyncSession = Depends(get_db),
    instrument_type: str | None = Query(default=None, enum=["index", "stock"]),
    horizon_months: int = Query(default=2, ge=1, le=3),
    lookback_months: int = Query(default=12, ge=6, le=24),
    sort_by: str = Query(default="signal_score", enum=["signal_score", "win_rate", "avg_move_pct"]),
    search: str | None = Query(default=None),
    limit: int = Query(default=200, le=500),
):
    """
    Build a futures directional outlook from stored spot-price history.

    Until a dedicated futures chain is added to the pipeline, this uses the
    underlying spot history as a proxy for directional futures planning.
    """
    return await build_futures_outlook(
        db,
        instrument_type=instrument_type,
        horizon_months=horizon_months,
        lookback_months=lookback_months,
        sort_by=sort_by,
        search=search,
        limit=limit,
    )
