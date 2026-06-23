"""
Alerts API endpoints.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.core.database import get_db
from app.models import Alert

router = APIRouter()


@router.get("/")
async def get_alerts(
    db: AsyncSession = Depends(get_db),
    is_sent: Optional[bool] = Query(default=None),
    symbol: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    """Get alerts with optional filters."""
    query = select(Alert).order_by(desc(Alert.created_at)).limit(limit)

    if is_sent is not None:
        query = query.where(Alert.is_sent == is_sent)
    if symbol:
        query = query.where(Alert.symbol == symbol.upper())

    result = await db.execute(query)
    alerts = result.scalars().all()

    return {
        "count": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "symbol": a.symbol,
                "alert_type": a.alert_type,
                "title": a.title,
                "message": a.message,
                "channel": a.channel,
                "is_sent": a.is_sent,
                "sent_at": a.sent_at.isoformat() if a.sent_at else None,
                "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ],
    }


@router.get("/unsent")
async def get_unsent_alerts(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, le=100),
):
    """Get unsent alerts."""
    query = (
        select(Alert)
        .where(Alert.is_sent == False)
        .order_by(Alert.created_at)
        .limit(limit)
    )
    result = await db.execute(query)
    alerts = result.scalars().all()

    return {
        "count": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "symbol": a.symbol,
                "alert_type": a.alert_type,
                "title": a.title,
                "message": a.message,
                "channel": a.channel,
                "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ],
    }
