"""
NSE Options Probability Intelligence Platform — FastAPI Application Entry Point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.api.v1.router import api_router

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    setup_logging(debug=settings.app_debug)
    logger.info(
        "Starting NSE Options Intelligence Platform",
        env=settings.app_env,
        debug=settings.app_debug,
    )
    yield
    logger.info("Shutting down NSE Options Intelligence Platform")


app = FastAPI(
    title="NSE Options Probability Intelligence Platform",
    description=(
        "AI-powered platform for identifying statistically optimal "
        "CE/PE selling bands for NSE derivatives."
    ),
    version="0.1.0",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

import os

# CORS middleware — allow Render URLs and local development
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
]
# Add Render deployed URL if available
render_url = os.environ.get("RENDER_EXTERNAL_URL")
if render_url:
    cors_origins.append(render_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "nse-options-intelligence",
    }




from sqlalchemy import func, select
from app.models import SpotPrice, OptionChain, DailyRecommendation

@app.get("/api/db-dates", tags=["Health"])
async def db_dates():
    from app.core.database import async_session_factory
    async with async_session_factory() as session:
        # Get unique dates from SpotPrice
        spot_dates_q = select(SpotPrice.date).distinct().order_by(SpotPrice.date.desc()).limit(10)
        spot_res = await session.execute(spot_dates_q)
        spot_dates = [str(d) for d in spot_res.scalars().all()]
        
        # Get unique dates from OptionChain (using trade_date column)
        option_dates_q = select(OptionChain.trade_date).distinct().order_by(OptionChain.trade_date.desc()).limit(10)
        option_res = await session.execute(option_dates_q)
        option_dates = [str(d) for d in option_res.scalars().all()]
        
        # Get unique dates from DailyRecommendation
        rec_dates_q = select(DailyRecommendation.date).distinct().order_by(DailyRecommendation.date.desc()).limit(10)
        rec_res = await session.execute(rec_dates_q)
        rec_dates = [str(d) for d in rec_res.scalars().all()]
        
    return {
        "spot_dates": spot_dates,
        "option_dates": option_dates,
        "recommendation_dates": rec_dates,
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "NSE Options Probability Intelligence Platform",
        "version": "0.1.0",
        "docs": "/api/docs",
        "health": "/health",
    }


from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "traceback": traceback.format_exc(),
        }
    )



