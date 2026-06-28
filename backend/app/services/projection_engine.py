"""Projection services for dashboard-facing options and futures views."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, timedelta
from math import ceil, floor
from statistics import mean, median, pstdev
from typing import Any, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    DailyRecommendation,
    FuturesChain,
    FnOUniverse,
    IndiaVIX,
    OptimalSellingBand,
    SpotPrice,
    StrategyResult,
)


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _round_or_none(value: Optional[float], digits: int = 2) -> Optional[float]:
    if value is None:
        return None
    return round(value, digits)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _percentile(values: list[float], quantile: float) -> Optional[float]:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * quantile
    low = floor(position)
    high = ceil(position)
    if low == high:
        return ordered[low]
    weight = position - low
    return ordered[low] + (ordered[high] - ordered[low]) * weight


async def get_latest_vix_snapshot(db: AsyncSession) -> dict[str, Any]:
    result = await db.execute(
        select(IndiaVIX.date, IndiaVIX.close).order_by(IndiaVIX.date.desc()).limit(1)
    )
    row = result.first()
    if not row:
        return {"value": None, "date": None}

    return {
        "value": _to_float(row.close),
        "date": str(row.date),
    }


async def build_options_projection_board(
    db: AsyncSession,
    *,
    instrument_type: Optional[str],
    expiry_type: str,
    analysis_period: str,
    optimization_mode: str,
    sort_by: str,
    search: Optional[str],
    limit: int,
) -> dict[str, Any]:
    latest_spot_subquery = (
        select(
            SpotPrice.symbol.label("symbol"),
            func.max(SpotPrice.date).label("latest_date"),
        )
        .group_by(SpotPrice.symbol)
        .subquery()
    )

    band_query = select(OptimalSellingBand).where(
        OptimalSellingBand.expiry_type == expiry_type,
        OptimalSellingBand.analysis_period == analysis_period,
        OptimalSellingBand.optimization_mode == optimization_mode,
        OptimalSellingBand.vix_regime.is_(None),
        OptimalSellingBand.market_regime.is_(None),
    )
    if instrument_type:
        band_query = band_query.where(OptimalSellingBand.instrument_type == instrument_type)
    if search:
        band_query = band_query.where(OptimalSellingBand.symbol.ilike(f"%{search.upper()}%"))

    band_result = await db.execute(band_query)
    bands = band_result.scalars().all()
    if not bands:
        snapshot = await get_latest_vix_snapshot(db)
        return {
            "filters": {
                "instrument_type": instrument_type or "all",
                "expiry_type": expiry_type,
                "analysis_period": analysis_period,
                "optimization_mode": optimization_mode,
                "sort_by": sort_by,
                "search": search or "",
                "limit": limit,
            },
            "summary": {
                "symbols": 0,
                "avg_probability": None,
                "avg_range_width_pct": None,
                "best_symbol": None,
                "best_score": None,
                "spot_date": None,
                "vix": snapshot["value"],
                "vix_date": snapshot["date"],
            },
            "projections": [],
        }

    symbols = sorted({band.symbol for band in bands})

    spot_query = (
        select(SpotPrice.symbol, SpotPrice.date, SpotPrice.close)
        .join(
            latest_spot_subquery,
            and_(
                SpotPrice.symbol == latest_spot_subquery.c.symbol,
                SpotPrice.date == latest_spot_subquery.c.latest_date,
            ),
        )
        .where(SpotPrice.symbol.in_(symbols))
    )
    spot_result = await db.execute(spot_query)
    spot_map = {
        row.symbol: {"spot_price": _to_float(row.close), "spot_date": str(row.date)}
        for row in spot_result
    }

    latest_rec_date_result = await db.execute(select(func.max(DailyRecommendation.date)))
    latest_rec_date = latest_rec_date_result.scalar()
    rec_map: dict[tuple[str, str], DailyRecommendation] = {}
    if latest_rec_date:
        rec_query = select(DailyRecommendation).where(
            DailyRecommendation.date == latest_rec_date,
            DailyRecommendation.symbol.in_(symbols),
        )
        rec_result = await db.execute(rec_query)
        rec_map = {
            (rec.symbol, rec.expiry_type): rec
            for rec in rec_result.scalars().all()
        }

    trade_count_query = (
        select(
            StrategyResult.symbol,
            StrategyResult.expiry_type,
            StrategyResult.ce_pct,
            StrategyResult.pe_pct,
            func.count().label("trade_count"),
            func.max(StrategyResult.expiry).label("last_expiry"),
        )
        .where(
            StrategyResult.symbol.in_(symbols),
            StrategyResult.expiry_type == expiry_type,
        )
        .group_by(
            StrategyResult.symbol,
            StrategyResult.expiry_type,
            StrategyResult.ce_pct,
            StrategyResult.pe_pct,
        )
    )
    trade_count_result = await db.execute(trade_count_query)
    trade_count_map = {
        (row.symbol, _to_float(row.ce_pct), _to_float(row.pe_pct)): {
            "trade_count": int(row.trade_count or 0),
            "last_expiry": str(row.last_expiry) if row.last_expiry else None,
        }
        for row in trade_count_result
    }

    rows: list[dict[str, Any]] = []
    for band in bands:
        spot_snapshot = spot_map.get(band.symbol)
        if not spot_snapshot or spot_snapshot["spot_price"] is None:
            continue

        spot_price = float(spot_snapshot["spot_price"])
        ce_pct = _to_float(band.recommended_ce_pct)
        pe_pct = _to_float(band.recommended_pe_pct)
        if ce_pct is None or pe_pct is None:
            continue

        rec = rec_map.get((band.symbol, expiry_type)) or rec_map.get((band.symbol, "monthly"))
        trade_stats = trade_count_map.get((band.symbol, ce_pct, pe_pct), {})
        combined_win_rate = _to_float(band.combined_win_rate)
        expected_value = _to_float(band.expected_value)
        sharpe_ratio = _to_float(band.sharpe_ratio)
        expected_value_pct = (
            (expected_value / spot_price) * 100 if expected_value is not None and spot_price else None
        )

        sample_score = _clamp((trade_stats.get("trade_count", 0) or 0) / 24, 0, 1) * 15
        probability_score = _clamp(combined_win_rate or 0, 0, 1) * 45
        sharpe_score = _clamp((sharpe_ratio or 0) / 6, 0, 1) * 20
        value_score = 0.0
        if expected_value_pct is not None:
            value_score = _clamp(expected_value_pct / 12, 0, 1) * 20

        projection_score = round(probability_score + sharpe_score + value_score + sample_score, 2)
        current_regime = rec.market_regime if rec else None

        rows.append(
            {
                "symbol": band.symbol,
                "instrument_type": band.instrument_type,
                "expiry_type": band.expiry_type,
                "analysis_period": band.analysis_period,
                "optimization_mode": band.optimization_mode,
                "spot_price": _round_or_none(spot_price),
                "spot_date": spot_snapshot["spot_date"],
                "recommended_ce_pct": ce_pct,
                "recommended_pe_pct": pe_pct,
                "recommended_ce_strike": _round_or_none(spot_price * (1 + ce_pct / 100)),
                "recommended_pe_strike": _round_or_none(spot_price * (1 - pe_pct / 100)),
                "ce_probability": _to_float(band.ce_win_rate),
                "pe_probability": _to_float(band.pe_win_rate),
                "combined_probability": combined_win_rate,
                "expected_value": expected_value,
                "expected_value_pct": _round_or_none(expected_value_pct),
                "sharpe_ratio": sharpe_ratio,
                "sortino_ratio": _to_float(band.sortino_ratio),
                "max_drawdown": _to_float(band.max_drawdown),
                "kelly_criterion": _to_float(band.kelly_criterion),
                "trade_count": trade_stats.get("trade_count", 0),
                "last_expiry": trade_stats.get("last_expiry"),
                "projection_score": projection_score,
                "range_width_pct": _round_or_none(ce_pct + pe_pct),
                "market_regime": current_regime,
                "current_vix": _to_float(rec.vix_at_recommendation) if rec else None,
            }
        )

    sorters = {
        "projection_score": lambda row: row["projection_score"] or 0,
        "combined_probability": lambda row: row["combined_probability"] or 0,
        "expected_value_pct": lambda row: row["expected_value_pct"] or 0,
        "sharpe_ratio": lambda row: row["sharpe_ratio"] or 0,
        "trade_count": lambda row: row["trade_count"] or 0,
    }
    rows.sort(key=sorters[sort_by], reverse=True)
    rows = rows[:limit]

    avg_probability = mean(
        [row["combined_probability"] for row in rows if row["combined_probability"] is not None]
    ) if rows else None
    avg_range_width = mean(
        [row["range_width_pct"] for row in rows if row["range_width_pct"] is not None]
    ) if rows else None
    snapshot = await get_latest_vix_snapshot(db)

    return {
        "filters": {
            "instrument_type": instrument_type or "all",
            "expiry_type": expiry_type,
            "analysis_period": analysis_period,
            "optimization_mode": optimization_mode,
            "sort_by": sort_by,
            "search": search or "",
            "limit": limit,
        },
        "summary": {
            "symbols": len(rows),
            "avg_probability": _round_or_none(avg_probability, 4) if avg_probability is not None else None,
            "avg_range_width_pct": _round_or_none(avg_range_width),
            "best_symbol": rows[0]["symbol"] if rows else None,
            "best_score": rows[0]["projection_score"] if rows else None,
            "spot_date": rows[0]["spot_date"] if rows else None,
            "vix": snapshot["value"],
            "vix_date": snapshot["date"],
        },
        "projections": rows,
    }


async def _build_spot_proxy_futures_outlook(
    db: AsyncSession,
    *,
    symbol_types: dict[str, str],
    symbols: list[str],
    instrument_type: Optional[str],
    horizon_months: int,
    lookback_months: int,
    sort_by: str,
    search: Optional[str],
    limit: int,
) -> dict[str, Any]:
    latest_spot_subquery = (
        select(
            SpotPrice.symbol.label("symbol"),
            func.max(SpotPrice.date).label("latest_date"),
        )
        .where(SpotPrice.symbol.in_(symbols))
        .group_by(SpotPrice.symbol)
        .subquery()
    )

    latest_spot_query = (
        select(SpotPrice.symbol, SpotPrice.date, SpotPrice.close)
        .join(
            latest_spot_subquery,
            and_(
                SpotPrice.symbol == latest_spot_subquery.c.symbol,
                SpotPrice.date == latest_spot_subquery.c.latest_date,
            ),
        )
    )
    latest_spot_result = await db.execute(latest_spot_query)
    latest_spot_map = {
        row.symbol: {"spot_price": _to_float(row.close), "spot_date": str(row.date)}
        for row in latest_spot_result
    }

    latest_date = None
    for snapshot in latest_spot_map.values():
        if snapshot["spot_date"]:
            latest_date = snapshot["spot_date"]
            break

    if not latest_date:
        return {
            "filters": {
                "instrument_type": instrument_type or "all",
                "horizon_months": horizon_months,
                "lookback_months": lookback_months,
                "sort_by": sort_by,
                "search": search or "",
                "limit": limit,
            },
            "summary": {
                "symbols": 0,
                "bullish": 0,
                "bearish": 0,
                "neutral": 0,
                "best_symbol": None,
                "best_score": None,
                "spot_date": None,
            },
            "methodology": "spot_history_proxy",
            "rows": [],
        }

    cutoff_date = date.fromisoformat(latest_date) - timedelta(days=lookback_months * 31)
    history_query = (
        select(SpotPrice.symbol, SpotPrice.date, SpotPrice.close)
        .where(
            SpotPrice.symbol.in_(symbols),
            SpotPrice.date >= cutoff_date,
        )
        .order_by(SpotPrice.symbol, SpotPrice.date)
    )
    history_result = await db.execute(history_query)

    history_map: dict[str, list[float]] = defaultdict(list)
    for row in history_result:
        close = _to_float(row.close)
        if close is not None:
            history_map[row.symbol].append(close)

    horizon_days = max(21, horizon_months * 21)
    rows: list[dict[str, Any]] = []
    for symbol, closes in history_map.items():
        if len(closes) <= horizon_days + 5:
            continue

        forward_returns = [
            (closes[idx + horizon_days] / closes[idx]) - 1
            for idx in range(0, len(closes) - horizon_days)
            if closes[idx] > 0
        ]
        if len(forward_returns) < 8:
            continue

        latest_snapshot = latest_spot_map.get(symbol)
        latest_close = latest_snapshot["spot_price"] if latest_snapshot else None
        if latest_close is None:
            continue

        avg_move = mean(forward_returns)
        median_move = median(forward_returns)
        win_rate = sum(1 for value in forward_returns if value > 0) / len(forward_returns)
        upside_case = _percentile(forward_returns, 0.75) or avg_move
        downside_case = _percentile(forward_returns, 0.25) or avg_move
        volatility = pstdev(forward_returns) if len(forward_returns) > 1 else 0.0

        if win_rate >= 0.58 and avg_move >= 0.01:
            bias = "bullish"
            setup = "Long futures"
        elif win_rate <= 0.42 and avg_move <= -0.01:
            bias = "bearish"
            setup = "Short futures"
        else:
            bias = "neutral"
            setup = "Wait / hedge"

        edge = abs(win_rate - 0.5) * 2
        magnitude = _clamp(abs(avg_move) / 0.12, 0, 1)
        stability = _clamp((1 - min(volatility, 0.20) / 0.20), 0, 1)
        sample_strength = _clamp(len(forward_returns) / 36, 0, 1)
        signal_score = round(
            (edge * 0.35 + magnitude * 0.25 + stability * 0.20 + sample_strength * 0.20)
            * 100,
            2,
        )

        rows.append(
            {
                "symbol": symbol,
                "instrument_type": symbol_types.get(symbol, "stock"),
                "spot_price": _round_or_none(latest_close),
                "spot_date": latest_snapshot["spot_date"] if latest_snapshot else None,
                "front_price": _round_or_none(latest_close),
                "front_expiry": None,
                "next_price": None,
                "next_expiry": None,
                "basis_pct": None,
                "roll_yield_pct": None,
                "bias": bias,
                "setup": setup,
                "target_price": _round_or_none(latest_close * (1 + median_move)),
                "upside_case_price": _round_or_none(latest_close * (1 + upside_case)),
                "downside_case_price": _round_or_none(latest_close * (1 + downside_case)),
                "avg_move_pct": _round_or_none(avg_move * 100),
                "median_move_pct": _round_or_none(median_move * 100),
                "upside_case_pct": _round_or_none(upside_case * 100),
                "downside_case_pct": _round_or_none(downside_case * 100),
                "win_rate": _round_or_none(win_rate, 4),
                "volatility_pct": _round_or_none(volatility * 100),
                "sample_size": len(forward_returns),
                "signal_score": signal_score,
            }
        )

    sorters = {
        "signal_score": lambda row: row["signal_score"] or 0,
        "win_rate": lambda row: abs((row["win_rate"] or 0) - 0.5),
        "avg_move_pct": lambda row: abs(row["avg_move_pct"] or 0),
    }
    rows.sort(key=sorters[sort_by], reverse=True)
    rows = rows[:limit]

    bias_counter = Counter(row["bias"] for row in rows)
    return {
        "filters": {
            "instrument_type": instrument_type or "all",
            "horizon_months": horizon_months,
            "lookback_months": lookback_months,
            "sort_by": sort_by,
            "search": search or "",
            "limit": limit,
        },
        "summary": {
            "symbols": len(rows),
            "bullish": bias_counter.get("bullish", 0),
            "bearish": bias_counter.get("bearish", 0),
            "neutral": bias_counter.get("neutral", 0),
            "best_symbol": rows[0]["symbol"] if rows else None,
            "best_score": rows[0]["signal_score"] if rows else None,
            "spot_date": rows[0]["spot_date"] if rows else None,
        },
        "methodology": "spot_history_proxy",
        "rows": rows,
    }


async def build_futures_outlook(
    db: AsyncSession,
    *,
    instrument_type: Optional[str],
    horizon_months: int,
    lookback_months: int,
    sort_by: str,
    search: Optional[str],
    limit: int,
) -> dict[str, Any]:
    universe_query = select(FnOUniverse.symbol, FnOUniverse.instrument_type).where(
        FnOUniverse.is_active.is_(True)
    )
    if instrument_type:
        universe_query = universe_query.where(FnOUniverse.instrument_type == instrument_type)
    if search:
        universe_query = universe_query.where(FnOUniverse.symbol.ilike(f"%{search.upper()}%"))

    universe_result = await db.execute(universe_query)
    universe_rows = universe_result.all()
    symbol_types = {row.symbol: row.instrument_type for row in universe_rows}
    symbols = list(symbol_types.keys())
    if not symbols:
        return {
            "filters": {
                "instrument_type": instrument_type or "all",
                "horizon_months": horizon_months,
                "lookback_months": lookback_months,
                "sort_by": sort_by,
                "search": search or "",
                "limit": limit,
            },
            "summary": {
                "symbols": 0,
                "bullish": 0,
                "bearish": 0,
                "neutral": 0,
                "best_symbol": None,
                "best_score": None,
                "spot_date": None,
            },
            "methodology": "front_month_futures",
            "rows": [],
        }
    try:
        latest_futures_date_result = await db.execute(
            select(func.max(FuturesChain.trade_date)).where(FuturesChain.symbol.in_(symbols))
        )
        latest_futures_date = latest_futures_date_result.scalar()
    except SQLAlchemyError:
        latest_futures_date = None

    if latest_futures_date is None:
        return await _build_spot_proxy_futures_outlook(
            db,
            symbol_types=symbol_types,
            symbols=symbols,
            instrument_type=instrument_type,
            horizon_months=horizon_months,
            lookback_months=lookback_months,
            sort_by=sort_by,
            search=search,
            limit=limit,
        )

    cutoff_date = latest_futures_date - timedelta(days=lookback_months * 31)
    try:
        futures_result = await db.execute(
            select(
                FuturesChain.symbol,
                FuturesChain.trade_date,
                FuturesChain.expiry,
                FuturesChain.close,
                FuturesChain.underlying_price,
                FuturesChain.oi,
                FuturesChain.volume,
            )
            .where(
                FuturesChain.symbol.in_(symbols),
                FuturesChain.trade_date >= cutoff_date,
            )
            .order_by(FuturesChain.symbol, FuturesChain.trade_date, FuturesChain.expiry)
        )
        futures_rows = futures_result.all()
    except SQLAlchemyError:
        futures_rows = []
    if not futures_rows:
        return await _build_spot_proxy_futures_outlook(
            db,
            symbol_types=symbol_types,
            symbols=symbols,
            instrument_type=instrument_type,
            horizon_months=horizon_months,
            lookback_months=lookback_months,
            sort_by=sort_by,
            search=search,
            limit=limit,
        )

    grouped_rows: dict[tuple[str, date], list[dict[str, Any]]] = defaultdict(list)
    for row in futures_rows:
        grouped_rows[(row.symbol, row.trade_date)].append(
            {
                "expiry": row.expiry,
                "close": _to_float(row.close),
                "underlying_price": _to_float(row.underlying_price),
                "oi": int(row.oi or 0),
                "volume": int(row.volume or 0),
            }
        )

    front_series_by_symbol: dict[str, list[dict[str, Any]]] = defaultdict(list)
    latest_snapshot_by_symbol: dict[str, dict[str, Any]] = {}
    for (symbol, trade_day), contracts in grouped_rows.items():
        ordered = sorted(contracts, key=lambda item: item["expiry"])
        front = next((contract for contract in ordered if contract["close"] is not None), None)
        if front is None:
            continue
        next_contract = next(
            (contract for contract in ordered if contract["expiry"] > front["expiry"] and contract["close"] is not None),
            None,
        )
        front_series_by_symbol[symbol].append(
            {
                "trade_date": trade_day,
                "close": front["close"],
                "expiry": front["expiry"],
                "underlying_price": front["underlying_price"],
                "oi": front["oi"],
                "volume": front["volume"],
                "next_close": next_contract["close"] if next_contract else None,
                "next_expiry": next_contract["expiry"] if next_contract else None,
            }
        )

        if trade_day == latest_futures_date:
            latest_snapshot_by_symbol[symbol] = front_series_by_symbol[symbol][-1]

    horizon_days = max(21, horizon_months * 21)
    rows: list[dict[str, Any]] = []
    for symbol, points in front_series_by_symbol.items():
        ordered_points = sorted(points, key=lambda item: item["trade_date"])
        if len(ordered_points) <= horizon_days + 5:
            continue

        forward_returns = [
            (ordered_points[idx + horizon_days]["close"] / ordered_points[idx]["close"]) - 1
            for idx in range(0, len(ordered_points) - horizon_days)
            if ordered_points[idx]["close"] and ordered_points[idx + horizon_days]["close"]
        ]
        if len(forward_returns) < 8:
            continue

        latest_point = latest_snapshot_by_symbol.get(symbol) or ordered_points[-1]
        current_front = latest_point["close"]
        if current_front is None:
            continue

        avg_move = mean(forward_returns)
        median_move = median(forward_returns)
        win_rate = sum(1 for value in forward_returns if value > 0) / len(forward_returns)
        upside_case = _percentile(forward_returns, 0.75) or avg_move
        downside_case = _percentile(forward_returns, 0.25) or avg_move
        volatility = pstdev(forward_returns) if len(forward_returns) > 1 else 0.0

        if win_rate >= 0.58 and avg_move >= 0.01:
            bias = "bullish"
            setup = "Long near-month futures"
        elif win_rate <= 0.42 and avg_move <= -0.01:
            bias = "bearish"
            setup = "Short near-month futures"
        else:
            bias = "neutral"
            setup = "Wait / hedge"

        basis_pct = None
        underlying_price = latest_point["underlying_price"]
        if underlying_price:
            basis_pct = ((current_front - underlying_price) / underlying_price) * 100
        roll_yield_pct = None
        if latest_point["next_close"]:
            roll_yield_pct = ((latest_point["next_close"] - current_front) / current_front) * 100

        edge = abs(win_rate - 0.5) * 2
        magnitude = _clamp(abs(avg_move) / 0.12, 0, 1)
        stability = _clamp((1 - min(volatility, 0.20) / 0.20), 0, 1)
        basis_signal = _clamp(abs(basis_pct or 0) / 5, 0, 1)
        sample_strength = _clamp(len(forward_returns) / 36, 0, 1)
        signal_score = round(
            (
                edge * 0.30
                + magnitude * 0.22
                + stability * 0.18
                + basis_signal * 0.10
                + sample_strength * 0.20
            )
            * 100,
            2,
        )

        rows.append(
            {
                "symbol": symbol,
                "instrument_type": symbol_types.get(symbol, "stock"),
                "spot_price": _round_or_none(underlying_price),
                "spot_date": str(latest_point["trade_date"]),
                "front_price": _round_or_none(current_front),
                "front_expiry": str(latest_point["expiry"]) if latest_point["expiry"] else None,
                "next_price": _round_or_none(latest_point["next_close"]),
                "next_expiry": str(latest_point["next_expiry"]) if latest_point["next_expiry"] else None,
                "basis_pct": _round_or_none(basis_pct),
                "roll_yield_pct": _round_or_none(roll_yield_pct),
                "bias": bias,
                "setup": setup,
                "target_price": _round_or_none(current_front * (1 + median_move)),
                "upside_case_price": _round_or_none(current_front * (1 + upside_case)),
                "downside_case_price": _round_or_none(current_front * (1 + downside_case)),
                "avg_move_pct": _round_or_none(avg_move * 100),
                "median_move_pct": _round_or_none(median_move * 100),
                "upside_case_pct": _round_or_none(upside_case * 100),
                "downside_case_pct": _round_or_none(downside_case * 100),
                "win_rate": _round_or_none(win_rate, 4),
                "volatility_pct": _round_or_none(volatility * 100),
                "sample_size": len(forward_returns),
                "signal_score": signal_score,
                "front_oi": latest_point["oi"],
                "front_volume": latest_point["volume"],
            }
        )

    sorters = {
        "signal_score": lambda row: row["signal_score"] or 0,
        "win_rate": lambda row: abs((row["win_rate"] or 0) - 0.5),
        "avg_move_pct": lambda row: abs(row["avg_move_pct"] or 0),
    }
    rows.sort(key=sorters[sort_by], reverse=True)
    rows = rows[:limit]

    bias_counter = Counter(row["bias"] for row in rows)
    return {
        "filters": {
            "instrument_type": instrument_type or "all",
            "horizon_months": horizon_months,
            "lookback_months": lookback_months,
            "sort_by": sort_by,
            "search": search or "",
            "limit": limit,
        },
        "summary": {
            "symbols": len(rows),
            "bullish": bias_counter.get("bullish", 0),
            "bearish": bias_counter.get("bearish", 0),
            "neutral": bias_counter.get("neutral", 0),
            "best_symbol": rows[0]["symbol"] if rows else None,
            "best_score": rows[0]["signal_score"] if rows else None,
            "spot_date": rows[0]["spot_date"] if rows else None,
        },
        "methodology": "front_month_futures",
        "rows": rows,
    }
