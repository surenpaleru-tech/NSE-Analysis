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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
    ],
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


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "NSE Options Probability Intelligence Platform",
        "version": "0.1.0",
        "docs": "/api/docs",
        "health": "/health",
    }
