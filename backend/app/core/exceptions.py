"""
Custom exception classes for the application.
"""

from typing import Any, Optional


class NSEIntelligenceError(Exception):
    """Base exception for all application errors."""

    def __init__(self, message: str, detail: Optional[Any] = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


class DataIngestionError(NSEIntelligenceError):
    """Raised when data ingestion fails."""
    pass


class DataValidationError(NSEIntelligenceError):
    """Raised when data validation fails."""
    pass


class AnalyticsError(NSEIntelligenceError):
    """Raised when analytics computation fails."""
    pass


class AuthenticationError(NSEIntelligenceError):
    """Raised when authentication fails."""
    pass


class AuthorizationError(NSEIntelligenceError):
    """Raised when user lacks required permissions."""
    pass


class RateLimitError(NSEIntelligenceError):
    """Raised when rate limit is exceeded."""
    pass


class ExternalAPIError(NSEIntelligenceError):
    """Raised when an external API call fails."""
    pass
