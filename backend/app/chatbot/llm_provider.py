"""
LLM Provider Abstraction — supports Ollama (local), OpenAI, and Google.
Configured via environment variable LLM_PROVIDER.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class BaseLLMProvider(ABC):
    """Abstract LLM provider interface."""

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a complete response."""
        ...

    @abstractmethod
    async def stream(self, prompt: str, system_prompt: str = "") -> AsyncIterator[str]:
        """Stream response tokens."""
        ...


class OllamaProvider(BaseLLMProvider):
    """Ollama local LLM provider."""

    def __init__(self):
        self.base_url = f"http://{settings.ollama_host}:{settings.ollama_port}"
        self.model = settings.ollama_model

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        import httpx

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": messages, "stream": False},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")

    async def stream(self, prompt: str, system_prompt: str = "") -> AsyncIterator[str]:
        import httpx
        import json

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": messages, "stream": True},
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content


class OpenAIProvider(BaseLLMProvider):
    """OpenAI LLM provider."""

    def __init__(self):
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
            model=self.model,
            api_key=self.api_key,
            temperature=0.1,
        )
        messages = []
        if system_prompt:
            messages.append(("system", system_prompt))
        messages.append(("human", prompt))

        response = await llm.ainvoke(messages)
        return response.content

    async def stream(self, prompt: str, system_prompt: str = "") -> AsyncIterator[str]:
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(
            model=self.model,
            api_key=self.api_key,
            temperature=0.1,
            streaming=True,
        )
        messages = []
        if system_prompt:
            messages.append(("system", system_prompt))
        messages.append(("human", prompt))

        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content


def get_llm_provider() -> BaseLLMProvider:
    """Factory function to get the configured LLM provider."""
    provider = settings.llm_provider.lower()

    if provider == "ollama":
        return OllamaProvider()
    elif provider == "openai":
        if not settings.openai_api_key:
            logger.warning("OpenAI API key not set, falling back to Ollama")
            return OllamaProvider()
        return OpenAIProvider()
    else:
        logger.warning(f"Unknown LLM provider '{provider}', falling back to Ollama")
        return OllamaProvider()
