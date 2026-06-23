"""
Application configuration via pydantic-settings.
All settings are loaded from environment variables or .env file.
"""

import os
from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load environment variables into os.environ
load_dotenv()

# Force redis-py to use RESP2 (avoids 'HELLO' command error with Redis 5.0)
os.environ["REDIS_SERIALIZATION_PROTOCOL"] = os.environ.get("REDIS_SERIALIZATION_PROTOCOL", "2")


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # -------------------------------------------------------------------------
    # Application
    # -------------------------------------------------------------------------
    app_env: str = "development"
    app_secret_key: str = "change_this_to_a_random_64_char_hex_string"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # -------------------------------------------------------------------------
    # PostgreSQL
    # -------------------------------------------------------------------------
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "nse_intelligence"
    postgres_user: str = "nse_admin"
    postgres_password: str = "change_me_in_production"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # -------------------------------------------------------------------------
    # Redis
    # -------------------------------------------------------------------------
    redis_host: str = "localhost"
    redis_port: int = 6379

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/0?protocol=2"

    # -------------------------------------------------------------------------
    # Qdrant
    # -------------------------------------------------------------------------
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333

    @property
    def qdrant_url(self) -> str:
        return f"http://{self.qdrant_host}:{self.qdrant_port}"

    # -------------------------------------------------------------------------
    # LLM Configuration
    # -------------------------------------------------------------------------
    llm_provider: str = "ollama"  # ollama | openai | google
    ollama_host: str = "localhost"
    ollama_port: int = 11434
    ollama_model: str = "llama3.1"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"
    google_api_key: Optional[str] = None
    google_model: str = "gemini-pro"
    embedding_provider: str = "local"
    embedding_model: str = "all-MiniLM-L6-v2"

    # -------------------------------------------------------------------------
    # JWT Authentication
    # -------------------------------------------------------------------------
    jwt_secret_key: str = "change_this_to_another_random_hex_string"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # -------------------------------------------------------------------------
    # NSE Data Ingestion
    # -------------------------------------------------------------------------
    nse_data_source: str = "nse_scraper"  # nse_scraper | broker_api
    ingestion_cron: str = "0 18 * * 1-5"
    nse_rate_limit: int = 3
    backfill_days: int = 365

    # -------------------------------------------------------------------------
    # Notifications
    # -------------------------------------------------------------------------
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None

    # -------------------------------------------------------------------------
    # Analytics
    # -------------------------------------------------------------------------
    vix_low_threshold: float = 15.0
    vix_high_threshold: float = 25.0
    market_bull_threshold: float = 3.0
    market_bear_threshold: float = -3.0
    otm_percentages: str = "1,2,3,4,5,6,7,8,9,10,12,15,20"

    @property
    def otm_pct_list(self) -> list[float]:
        return [float(x.strip()) for x in self.otm_percentages.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
