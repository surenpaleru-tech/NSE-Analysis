"""
Analytics API endpoints — heatmaps, history, regime analysis.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_

from app.core.database import get_db
from app.models import StrategyResult, OptimalSellingBand

router = APIRouter()


@router.get("/heatmap/{symbol}")
async def get_heatmap_data(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    expiry_type: str = Query(default="monthly", enum=["weekly", "monthly"]),
    metric: str = Query(
        default="expected_value",
        enum=["expected_value", "win_rate", "sharpe_ratio", "max_drawdown", "probability_expire_worthless"],
    ),
):
    """
    Get heatmap data for CE/PE band exploration.
    Returns a matrix of metrics for all CE%/PE% combinations.
    """
    query = (
        select(OptimalSellingBand)
        .where(
            OptimalSellingBand.symbol == symbol.upper(),
            OptimalSellingBand.expiry_type == expiry_type,
            OptimalSellingBand.vix_regime.is_(None),
            OptimalSellingBand.market_regime.is_(None),
        )
    )
    result = await db.execute(query)
    bands = result.scalars().all()

    if not bands:
        raise HTTPException(status_code=404, detail=f"No analytics data found for {symbol}")

    # Build heatmap matrix
    heatmap = []
    for band in bands:
        metric_value = getattr(band, metric.replace("expected_value", "expected_value"), None)
        if metric == "expected_value":
            metric_value = band.expected_value
        elif metric == "win_rate":
            metric_value = band.combined_win_rate
        elif metric == "sharpe_ratio":
            metric_value = band.sharpe_ratio
        elif metric == "max_drawdown":
            metric_value = band.max_drawdown
        elif metric == "probability_expire_worthless":
            metric_value = band.probability_expire_worthless

        heatmap.append({
            "ce_pct": float(band.recommended_ce_pct) if band.recommended_ce_pct else None,
            "pe_pct": float(band.recommended_pe_pct) if band.recommended_pe_pct else None,
            "value": float(metric_value) if metric_value else None,
            "analysis_period": band.analysis_period,
        })

    return {
        "symbol": symbol.upper(),
        "expiry_type": expiry_type,
        "metric": metric,
        "data": heatmap,
    }


@router.get("/history/{symbol}")
async def get_strategy_history(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    expiry_type: str = Query(default="monthly", enum=["weekly", "monthly"]),
    ce_pct: Optional[float] = Query(default=None),
    pe_pct: Optional[float] = Query(default=None),
    limit: int = Query(default=52, le=200),
):
    """Get historical strategy results for a symbol."""
    query = (
        select(StrategyResult)
        .where(
            StrategyResult.symbol == symbol.upper(),
            StrategyResult.expiry_type == expiry_type,
        )
        .order_by(desc(StrategyResult.expiry))
        .limit(limit)
    )

    if ce_pct is not None:
        query = query.where(StrategyResult.ce_pct == ce_pct)
    if pe_pct is not None:
        query = query.where(StrategyResult.pe_pct == pe_pct)

    result = await db.execute(query)
    results = result.scalars().all()

    return {
        "symbol": symbol.upper(),
        "expiry_type": expiry_type,
        "count": len(results),
        "results": [
            {
                "expiry": str(r.expiry),
                "ce_pct": float(r.ce_pct),
                "pe_pct": float(r.pe_pct),
                "ce_strike": float(r.ce_strike) if r.ce_strike else None,
                "pe_strike": float(r.pe_strike) if r.pe_strike else None,
                "spot_at_entry": float(r.spot_at_entry) if r.spot_at_entry else None,
                "spot_at_expiry": float(r.spot_at_expiry) if r.spot_at_expiry else None,
                "ce_pnl": float(r.ce_pnl) if r.ce_pnl else None,
                "pe_pnl": float(r.pe_pnl) if r.pe_pnl else None,
                "total_pnl": float(r.total_pnl) if r.total_pnl else None,
                "return_pct": float(r.return_pct) if r.return_pct else None,
                "ce_expired_worthless": r.ce_expired_worthless,
                "pe_expired_worthless": r.pe_expired_worthless,
                "market_regime": r.market_regime,
            }
            for r in results
        ],
    }


@router.get("/regimes/{symbol}")
async def get_regime_analysis(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    expiry_type: str = Query(default="monthly", enum=["weekly", "monthly"]),
):
    """Get regime-segmented optimal bands for a symbol."""
    query = (
        select(OptimalSellingBand)
        .where(
            OptimalSellingBand.symbol == symbol.upper(),
            OptimalSellingBand.expiry_type == expiry_type,
            OptimalSellingBand.optimization_mode == "expected_value",
        )
    )
    result = await db.execute(query)
    bands = result.scalars().all()

    regime_data = {}
    for band in bands:
        key = f"{band.vix_regime or 'all'}_{band.market_regime or 'all'}"
        regime_data[key] = {
            "vix_regime": band.vix_regime,
            "market_regime": band.market_regime,
            "analysis_period": band.analysis_period,
            "recommended_ce_pct": float(band.recommended_ce_pct) if band.recommended_ce_pct else None,
            "recommended_pe_pct": float(band.recommended_pe_pct) if band.recommended_pe_pct else None,
            "combined_win_rate": float(band.combined_win_rate) if band.combined_win_rate else None,
            "expected_value": float(band.expected_value) if band.expected_value else None,
            "sharpe_ratio": float(band.sharpe_ratio) if band.sharpe_ratio else None,
            "sortino_ratio": float(band.sortino_ratio) if band.sortino_ratio else None,
            "calmar_ratio": float(band.calmar_ratio) if band.calmar_ratio else None,
            "max_drawdown": float(band.max_drawdown) if band.max_drawdown else None,
            "kelly_criterion": float(band.kelly_criterion) if band.kelly_criterion else None,
            "probability_expire_worthless": float(band.probability_expire_worthless) if band.probability_expire_worthless else None,
        }

    return {
        "symbol": symbol.upper(),
        "expiry_type": expiry_type,
        "regimes": regime_data,
    }


@router.get("/compare")
async def compare_symbols(
    db: AsyncSession = Depends(get_db),
    symbols: str = Query(..., description="Comma-separated symbols"),
    expiry_type: str = Query(default="monthly", enum=["weekly", "monthly"]),
):
    """Compare optimal bands across multiple symbols."""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]

    query = (
        select(OptimalSellingBand)
        .where(
            OptimalSellingBand.symbol.in_(symbol_list),
            OptimalSellingBand.expiry_type == expiry_type,
            OptimalSellingBand.optimization_mode == "expected_value",
            OptimalSellingBand.analysis_period == "1y",
            OptimalSellingBand.vix_regime.is_(None),
            OptimalSellingBand.market_regime.is_(None),
        )
    )
    result = await db.execute(query)
    bands = result.scalars().all()

    return {
        "expiry_type": expiry_type,
        "comparison": [
            {
                "symbol": b.symbol,
                "instrument_type": b.instrument_type,
                "recommended_ce_pct": float(b.recommended_ce_pct) if b.recommended_ce_pct else None,
                "recommended_pe_pct": float(b.recommended_pe_pct) if b.recommended_pe_pct else None,
                "combined_win_rate": float(b.combined_win_rate) if b.combined_win_rate else None,
                "expected_value": float(b.expected_value) if b.expected_value else None,
                "sharpe_ratio": float(b.sharpe_ratio) if b.sharpe_ratio else None,
                "sortino_ratio": float(b.sortino_ratio) if b.sortino_ratio else None,
                "calmar_ratio": float(b.calmar_ratio) if b.calmar_ratio else None,
                "max_drawdown": float(b.max_drawdown) if b.max_drawdown else None,
                "kelly_criterion": float(b.kelly_criterion) if b.kelly_criterion else None,
            }
            for b in bands
        ],
    }
