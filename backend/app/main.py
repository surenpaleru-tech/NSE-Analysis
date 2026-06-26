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


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "NSE Options Probability Intelligence Platform",
        "version": "0.1.0",
        "docs": "/api/docs",
        "health": "/health",
    }


from urllib.parse import urlparse
import socket

@app.get("/api/db-check", tags=["Health"])
async def db_check():
    url = settings.database_url
    
    # Mask password for safety
    parsed = urlparse(url)
    masked_url = f"{parsed.scheme}://{parsed.username}:*****@{parsed.hostname}:{parsed.port}{parsed.path}"
    
    # Check DNS resolution
    dns_resolved = "Unknown"
    dns_error = None
    if parsed.hostname:
        try:
            dns_resolved = socket.gethostbyname(parsed.hostname)
        except Exception as e:
            dns_error = str(e)
            
    # Check asyncpg parsing
    asyncpg_parsed = {}
    asyncpg_error = None
    try:
        from asyncpg.connect_utils import _parse_connect_dsn_and_args
        addrs, params = _parse_connect_dsn_and_args(
            dsn=url,
            host=None, port=None, user=None, password=None, passfile=None, database=None, ssl=None,
            service=None, servicefile=None, direct_tls=None, server_settings=None,
            target_session_attrs=None, krbsrvname=None, gsslib=None
        )
        asyncpg_parsed = {
            "addrs": str(addrs),
            "user": str(params.user),
            "password": "*****" if params.password else None,
            "database": str(params.database),
            "ssl": str(params.ssl),
        }
    except Exception as e:
        asyncpg_error = str(e)
        
    return {
        "database_url_configured": bool(os.environ.get("DATABASE_URL") or os.environ.get("database_url")),
        "database_url_raw_length": len(os.environ.get("DATABASE_URL") or os.environ.get("database_url") or ""),
        "masked_url": masked_url,
        "parsed_hostname": parsed.hostname,
        "parsed_hostname_len": len(parsed.hostname or ""),
        "parsed_hostname_repr": repr(parsed.hostname),
        "dns_resolved_ip": dns_resolved,
        "dns_error": dns_error,
        "asyncpg_parsed": asyncpg_parsed,
        "asyncpg_error": asyncpg_error,
    }


import asyncpg

@app.get("/api/test-db", tags=["Health"])
async def test_db():
    url = settings.database_url
    dsn = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    
    conn_error = None
    connected = False
    try:
        conn = await asyncpg.connect(dsn, ssl="require")
        connected = True
        await conn.close()
    except Exception as e:
        conn_error = str(e)
        
    # Mask password in return DSN
    masked_dsn = dsn
    try:
        parts = dsn.split("@")
        cred = parts[0].split(":")
        masked_dsn = f"{cred[0]}:{cred[1]}:*****@{parts[1]}"
    except:
        pass
        
    return {
        "dsn_used": masked_dsn,
        "connected": connected,
        "conn_error": conn_error,
    }


from sqlalchemy import func, select
from app.models import SpotPrice, OptionChain, IndiaVIX, OptimalSellingBand, DailyRecommendation, Alert

@app.get("/api/db-summary", tags=["Health"])
async def db_summary():
    counts = {}
    errors = {}
    from app.core.database import async_session_factory
    async with async_session_factory() as session:
        for model_name, model_cls in [
            ("SpotPrice", SpotPrice),
            ("OptionChain", OptionChain),
            ("IndiaVIX", IndiaVIX),
            ("OptimalSellingBand", OptimalSellingBand),
            ("DailyRecommendation", DailyRecommendation),
            ("Alert", Alert),
        ]:
            try:
                result = await session.execute(select(func.count()).select_from(model_cls))
                counts[model_name] = result.scalar()
            except Exception as e:
                errors[model_name] = str(e)
    return {
        "counts": counts,
        "errors": errors,
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
