"""
API v1 Router — aggregates all sub-routers.
"""

from fastapi import APIRouter

from app.api.v1 import dashboard, recommendations, analytics, scanner, chat, alerts, auth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(scanner.router, prefix="/scanner", tags=["Scanner"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
