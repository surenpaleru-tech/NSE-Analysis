"""
Telegram notification service.
"""

from typing import Optional

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class TelegramNotifier:
    """Send notifications via Telegram bot."""

    def __init__(self):
        self.bot_token = settings.telegram_bot_token
        self.chat_id = settings.telegram_chat_id

    @property
    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    async def send_message(self, message: str) -> bool:
        """Send a text message to the configured Telegram chat."""
        if not self.is_configured:
            logger.warning("Telegram not configured, skipping notification")
            return False

        try:
            import httpx

            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            payload = {
                "chat_id": self.chat_id,
                "text": message,
                "parse_mode": "Markdown",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    logger.info("Telegram message sent successfully")
                    return True
                else:
                    logger.error(f"Telegram API error: {response.status_code}")
                    return False

        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")
            return False

    async def send_recommendation_alert(
        self,
        symbol: str,
        spot_price: float,
        ce_strike: float,
        ce_pct: float,
        pe_strike: float,
        pe_pct: float,
        expected_return: float,
        probability: float,
    ) -> bool:
        """Send a formatted recommendation alert."""
        message = (
            f"🔔 *NSE Options Alert*\n\n"
            f"*{symbol}*\n"
            f"Spot: ₹{spot_price:,.2f}\n\n"
            f"📈 *Suggested CE*: ₹{ce_strike:,.0f} (+{ce_pct:.1f}%)\n"
            f"📉 *Suggested PE*: ₹{pe_strike:,.0f} (-{pe_pct:.1f}%)\n\n"
            f"💰 Expected Return: {expected_return:.1f}%\n"
            f"🎯 Combined Probability: {probability:.0f}%\n"
        )
        return await self.send_message(message)
