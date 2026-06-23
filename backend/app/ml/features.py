"""
Feature Engineering — generates ML features from market data.

Features:
- VIX level and percentile
- OI ratios and changes
- IV and IV skew
- Put-Call Ratio (PCR)
- Historical returns (1d, 5d, 20d)
- Realized vs implied volatility gap
- Trend indicators (SMA, RSI)
- Days to expiry
- Moneyness
"""

from datetime import date, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import SpotPrice, IndiaVIX, OptionChain
from app.core.logging import get_logger

logger = get_logger(__name__)


class FeatureEngineer:
    """Generates ML features for option selling predictions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_features(
        self,
        symbol: str,
        trade_date: date,
        expiry_date: date,
    ) -> Optional[dict]:
        """
        Build feature vector for a symbol on a given date.

        Returns dict of feature_name -> feature_value, or None if insufficient data.
        """
        features = {}

        try:
            # 1. Spot price features
            spot_features = await self._spot_features(symbol, trade_date)
            if not spot_features:
                return None
            features.update(spot_features)

            # 2. VIX features
            vix_features = await self._vix_features(trade_date)
            features.update(vix_features)

            # 3. Days to expiry
            dte = (expiry_date - trade_date).days
            features["days_to_expiry"] = dte
            features["dte_sqrt"] = np.sqrt(max(dte, 1))

            # 4. Option chain aggregate features
            oc_features = await self._option_chain_features(symbol, trade_date, expiry_date)
            features.update(oc_features)

            # 5. Calendar features
            features["day_of_week"] = trade_date.weekday()
            features["month"] = trade_date.month
            features["is_month_end"] = 1 if trade_date.day >= 25 else 0

            return features

        except Exception as e:
            logger.warning(f"Feature engineering failed: {e}", symbol=symbol)
            return None

    async def _spot_features(self, symbol: str, trade_date: date) -> Optional[dict]:
        """Compute spot price-based features."""
        # Get last 50 trading days of spot data
        query = (
            select(SpotPrice.date, SpotPrice.close, SpotPrice.high, SpotPrice.low, SpotPrice.volume)
            .where(
                SpotPrice.symbol == symbol,
                SpotPrice.date <= trade_date,
            )
            .order_by(SpotPrice.date.desc())
            .limit(50)
        )
        result = await self.db.execute(query)
        rows = result.all()

        if len(rows) < 20:
            return None

        closes = np.array([float(r.close) for r in reversed(rows)])
        highs = np.array([float(r.high) for r in reversed(rows) if r.high])
        lows = np.array([float(r.low) for r in reversed(rows) if r.low])

        current_price = closes[-1]

        # Returns
        features = {
            "spot_price": current_price,
            "return_1d": (closes[-1] / closes[-2] - 1) * 100 if len(closes) >= 2 else 0,
            "return_5d": (closes[-1] / closes[-6] - 1) * 100 if len(closes) >= 6 else 0,
            "return_20d": (closes[-1] / closes[-21] - 1) * 100 if len(closes) >= 21 else 0,
        }

        # Moving averages
        sma_5 = np.mean(closes[-5:])
        sma_20 = np.mean(closes[-20:])
        features["sma_5"] = sma_5
        features["sma_20"] = sma_20
        features["sma_5_20_ratio"] = sma_5 / sma_20 if sma_20 > 0 else 1
        features["price_sma20_ratio"] = current_price / sma_20 if sma_20 > 0 else 1

        # Volatility (realized)
        log_returns = np.diff(np.log(closes[-21:]))
        features["realized_vol_20d"] = float(np.std(log_returns) * np.sqrt(252) * 100)

        # RSI (14-period)
        if len(closes) >= 15:
            features["rsi_14"] = self._compute_rsi(closes, 14)
        else:
            features["rsi_14"] = 50.0

        # Average True Range
        if len(highs) >= 14 and len(lows) >= 14:
            tr = np.maximum(
                highs[-14:] - lows[-14:],
                np.maximum(
                    np.abs(highs[-14:] - closes[-15:-1]),
                    np.abs(lows[-14:] - closes[-15:-1]),
                )
            )
            features["atr_14"] = float(np.mean(tr))
            features["atr_pct"] = features["atr_14"] / current_price * 100
        else:
            features["atr_14"] = 0
            features["atr_pct"] = 0

        return features

    async def _vix_features(self, trade_date: date) -> dict:
        """Compute VIX-based features."""
        query = (
            select(IndiaVIX.close)
            .where(IndiaVIX.date <= trade_date)
            .order_by(IndiaVIX.date.desc())
            .limit(20)
        )
        result = await self.db.execute(query)
        vix_values = [float(r[0]) for r in result.all()]

        if not vix_values:
            return {"vix": 15.0, "vix_percentile": 50.0, "vix_change_5d": 0}

        current_vix = vix_values[0]
        return {
            "vix": current_vix,
            "vix_percentile": float(np.percentile(vix_values, 50)),
            "vix_sma_5": float(np.mean(vix_values[:5])),
            "vix_change_5d": (vix_values[0] / vix_values[4] - 1) * 100 if len(vix_values) >= 5 else 0,
        }

    async def _option_chain_features(
        self, symbol: str, trade_date: date, expiry_date: date,
    ) -> dict:
        """Compute option chain aggregate features."""
        query = (
            select(
                OptionChain.option_type,
                func.sum(OptionChain.oi).label("total_oi"),
                func.sum(OptionChain.volume).label("total_vol"),
                func.avg(OptionChain.implied_volatility).label("avg_iv"),
            )
            .where(
                OptionChain.symbol == symbol,
                OptionChain.trade_date == trade_date,
                OptionChain.expiry == expiry_date,
            )
            .group_by(OptionChain.option_type)
        )
        result = await self.db.execute(query)
        rows = result.all()

        ce_oi, pe_oi = 0, 0
        ce_vol, pe_vol = 0, 0
        ce_iv, pe_iv = 0, 0

        for row in rows:
            if row.option_type == "CE":
                ce_oi = int(row.total_oi or 0)
                ce_vol = int(row.total_vol or 0)
                ce_iv = float(row.avg_iv or 0)
            else:
                pe_oi = int(row.total_oi or 0)
                pe_vol = int(row.total_vol or 0)
                pe_iv = float(row.avg_iv or 0)

        total_oi = ce_oi + pe_oi
        pcr_oi = pe_oi / ce_oi if ce_oi > 0 else 1.0
        pcr_vol = pe_vol / ce_vol if ce_vol > 0 else 1.0

        return {
            "pcr_oi": pcr_oi,
            "pcr_volume": pcr_vol,
            "total_oi": total_oi,
            "ce_oi": ce_oi,
            "pe_oi": pe_oi,
            "avg_ce_iv": ce_iv,
            "avg_pe_iv": pe_iv,
            "iv_skew": pe_iv - ce_iv,
        }

    @staticmethod
    def _compute_rsi(prices: np.ndarray, period: int = 14) -> float:
        """Compute RSI indicator."""
        deltas = np.diff(prices[-(period + 1):])
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        avg_gain = np.mean(gains)
        avg_loss = np.mean(losses)
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return float(100 - (100 / (1 + rs)))
