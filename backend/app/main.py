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



@app.get("/api/db-symbols", tags=["Health"])
async def db_symbols():
    from app.core.database import async_session_factory
    from sqlalchemy import text
    async with async_session_factory() as session:
        # Get distinct symbols in fno_universe
        fno_res = await session.execute(text("SELECT DISTINCT symbol FROM fno_universe ORDER BY symbol;"))
        fno_symbols = [row[0] for row in fno_res.all()]
        
        # Get distinct symbols in option_chain
        oc_res = await session.execute(text("SELECT DISTINCT symbol FROM option_chain ORDER BY symbol;"))
        oc_symbols = [row[0] for row in oc_res.all()]
        
        # Get distinct symbols in spot_prices
        spot_res = await session.execute(text("SELECT DISTINCT symbol FROM spot_prices ORDER BY symbol;"))
        spot_symbols = [row[0] for row in spot_res.all()]
        
    return {
        "fno_universe": fno_symbols,
        "option_chain_count": len(oc_symbols),
        "option_chain_samples": oc_symbols[:10],
        "spot_prices_count": len(spot_symbols),
        "spot_prices_samples": spot_symbols[:10],
        "nifty_in_oc": "NIFTY" in oc_symbols,
        "nifty_in_spot": "NIFTY" in spot_symbols,
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




