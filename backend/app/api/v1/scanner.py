"""
Opportunity Scanner API endpoints.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.core.database import get_db
from app.models import DailyRecommendation, OptionChain

router = APIRouter()


@router.get("/opportunities")
async def get_top_opportunities(
    db: AsyncSession = Depends(get_db),
    sort_by: str = Query(
        default="expected_return",
        enum=["expected_return", "combined_probability", "risk_score"],
    ),
    limit: int = Query(default=250, le=1000),
):
    """Get top opportunities ranked by selected metric."""
    # Get latest date with recommendations
    latest_date_q = select(func.max(DailyRecommendation.date))
    latest_date_result = await db.execute(latest_date_q)
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return {"date": None, "opportunities": []}

    order_col = {
        "expected_return": desc(DailyRecommendation.expected_return),
        "combined_probability": desc(DailyRecommendation.combined_probability),
        "risk_score": DailyRecommendation.risk_score,  # ascending for risk
    }[sort_by]

    query = (
        select(DailyRecommendation)
        .where(DailyRecommendation.date == latest_date)
        .order_by(order_col)
        .limit(limit)
    )
    result = await db.execute(query)
    recs = result.scalars().all()

    # Load all option chain close prices for latest_date into memory
    oc_q = select(
        OptionChain.symbol,
        OptionChain.strike,
        OptionChain.option_type,
        OptionChain.close
    ).where(OptionChain.trade_date == latest_date)
    oc_res = await db.execute(oc_q)
    
    # Build lookup map: (symbol, strike_float, option_type) -> close_premium
    premium_map = {}
    for row in oc_res.all():
        sym, strike, opt_type, close = row
        premium_map[(sym, float(strike), opt_type)] = float(close) if close is not None else None

    return {
        "date": str(latest_date),
        "sort_by": sort_by,
        "opportunities": [
            {
                "rank": idx + 1,
                "symbol": r.symbol,
                "instrument_type": r.instrument_type,
                "expiry_type": r.expiry_type,
                "spot_price": float(r.spot_price) if r.spot_price else None,
                "recommended_ce_pct": float(r.recommended_ce_pct) if r.recommended_ce_pct else None,
                "recommended_pe_pct": float(r.recommended_pe_pct) if r.recommended_pe_pct else None,
                "recommended_ce_strike": float(r.recommended_ce_strike) if r.recommended_ce_strike else None,
                "recommended_pe_strike": float(r.recommended_pe_strike) if r.recommended_pe_strike else None,
                "ce_premium": premium_map.get((r.symbol, float(r.recommended_ce_strike), "CE")) if r.recommended_ce_strike else None,
                "pe_premium": premium_map.get((r.symbol, float(r.recommended_pe_strike), "PE")) if r.recommended_pe_strike else None,
                "combined_probability": float(r.combined_probability) if r.combined_probability else None,
                "expected_return": float(r.expected_return) if r.expected_return else None,
                "risk_score": float(r.risk_score) if r.risk_score else None,
                "vix": float(r.vix_at_recommendation) if r.vix_at_recommendation else None,
                "market_regime": r.market_regime,
            }
            for idx, r in enumerate(recs)
        ],
    }


@router.get("/filters")
async def filter_opportunities(
    db: AsyncSession = Depends(get_db),
    min_probability: float = Query(default=0.0, ge=0, le=1),
    max_risk_score: float = Query(default=1.0, ge=0, le=1),
    min_expected_return: float = Query(default=0.0),
    instrument_type: str = Query(default=None, enum=["index", "stock"]),
    limit: int = Query(default=50, le=200),
):
    """Filter opportunities with custom criteria."""
    latest_date_q = select(func.max(DailyRecommendation.date))
    latest_date_result = await db.execute(latest_date_q)
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return {"date": None, "opportunities": []}

    query = (
        select(DailyRecommendation)
        .where(DailyRecommendation.date == latest_date)
    )

    if min_probability > 0:
        query = query.where(DailyRecommendation.combined_probability >= min_probability)
    if max_risk_score < 1:
        query = query.where(DailyRecommendation.risk_score <= max_risk_score)
    if min_expected_return > 0:
        query = query.where(DailyRecommendation.expected_return >= min_expected_return)
    if instrument_type:
        query = query.where(DailyRecommendation.instrument_type == instrument_type)

    query = query.order_by(desc(DailyRecommendation.expected_return)).limit(limit)

    result = await db.execute(query)
    recs = result.scalars().all()

    return {
        "date": str(latest_date),
        "filters": {
            "min_probability": min_probability,
            "max_risk_score": max_risk_score,
            "min_expected_return": min_expected_return,
            "instrument_type": instrument_type,
        },
        "count": len(recs),
        "opportunities": [
            {
                "symbol": r.symbol,
                "instrument_type": r.instrument_type,
                "expiry_type": r.expiry_type,
                "spot_price": float(r.spot_price) if r.spot_price else None,
                "recommended_ce_pct": float(r.recommended_ce_pct) if r.recommended_ce_pct else None,
                "recommended_pe_pct": float(r.recommended_pe_pct) if r.recommended_pe_pct else None,
                "combined_probability": float(r.combined_probability) if r.combined_probability else None,
                "expected_return": float(r.expected_return) if r.expected_return else None,
                "risk_score": float(r.risk_score) if r.risk_score else None,
            }
            for r in recs
        ],
    }
