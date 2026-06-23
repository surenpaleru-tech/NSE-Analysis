"""
Recommendations API endpoints.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.core.database import get_db
from app.models import DailyRecommendation

router = APIRouter()


@router.get("/today")
async def get_today_recommendations(
    db: AsyncSession = Depends(get_db),
    instrument_type: Optional[str] = Query(default=None, enum=["index", "stock"]),
    expiry_type: Optional[str] = Query(default=None, enum=["weekly", "monthly"]),
):
    """Get today's recommendations (or latest available date)."""
    latest_date_q = select(func.max(DailyRecommendation.date))
    latest_date_result = await db.execute(latest_date_q)
    latest_date = latest_date_result.scalar()

    if not latest_date:
        return {"date": None, "recommendations": []}

    query = select(DailyRecommendation).where(DailyRecommendation.date == latest_date)

    if instrument_type:
        query = query.where(DailyRecommendation.instrument_type == instrument_type)
    if expiry_type:
        query = query.where(DailyRecommendation.expiry_type == expiry_type)

    query = query.order_by(desc(DailyRecommendation.expected_return))

    result = await db.execute(query)
    recs = result.scalars().all()

    return {
        "date": str(latest_date),
        "count": len(recs),
        "recommendations": [
            {
                "symbol": r.symbol,
                "instrument_type": r.instrument_type,
                "expiry_type": r.expiry_type,
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
                "vix": float(r.vix_at_recommendation) if r.vix_at_recommendation else None,
                "market_regime": r.market_regime,
            }
            for r in recs
        ],
    }


@router.get("/{symbol}")
async def get_symbol_recommendation(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    expiry_type: Optional[str] = Query(default=None, enum=["weekly", "monthly"]),
    days: int = Query(default=30, le=365),
):
    """Get recommendation history for a specific symbol."""
    query = (
        select(DailyRecommendation)
        .where(DailyRecommendation.symbol == symbol.upper())
        .order_by(desc(DailyRecommendation.date))
        .limit(days)
    )

    if expiry_type:
        query = query.where(DailyRecommendation.expiry_type == expiry_type)

    result = await db.execute(query)
    recs = result.scalars().all()

    if not recs:
        raise HTTPException(status_code=404, detail=f"No recommendations found for {symbol}")

    return {
        "symbol": symbol.upper(),
        "count": len(recs),
        "history": [
            {
                "date": str(r.date),
                "expiry_type": r.expiry_type,
                "spot_price": float(r.spot_price) if r.spot_price else None,
                "recommended_ce_pct": float(r.recommended_ce_pct) if r.recommended_ce_pct else None,
                "recommended_pe_pct": float(r.recommended_pe_pct) if r.recommended_pe_pct else None,
                "recommended_ce_strike": float(r.recommended_ce_strike) if r.recommended_ce_strike else None,
                "recommended_pe_strike": float(r.recommended_pe_strike) if r.recommended_pe_strike else None,
                "combined_probability": float(r.combined_probability) if r.combined_probability else None,
                "expected_return": float(r.expected_return) if r.expected_return else None,
                "market_regime": r.market_regime,
            }
            for r in recs
        ],
    }
