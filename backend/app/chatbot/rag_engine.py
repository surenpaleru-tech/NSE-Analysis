"""
RAG Engine — Retrieval-Augmented Generation for the chatbot.
Routes questions to SQL agent or vector search, then generates answers via LLM.
"""

import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.chatbot.sql_agent import SQLAgent
from app.chatbot.llm_provider import get_llm_provider
from app.core.logging import get_logger
from app.models import ChatHistory

logger = get_logger(__name__)

# Question classification keywords
SQL_KEYWORDS = {
    "how many", "count", "average", "sum", "total", "max", "min",
    "compare", "list", "show", "which", "what is the", "top",
    "rank", "best", "worst", "highest", "lowest",
    "probability", "win rate", "sharpe", "drawdown",
    "recommend", "suggestion", "today", "latest",
}

EXPLAIN_KEYWORDS = {
    "explain", "why", "how does", "what does", "describe",
    "tell me about", "help me understand", "overview",
}

SYSTEM_PROMPT = """You are the AI assistant for the NSE Options Probability Intelligence Platform.
You help traders understand optimal CE/PE option selling strategies for Indian markets.

Your capabilities:
1. Query the database for recommendations, analytics, and historical data
2. Explain option selling strategies and risk metrics
3. Compare symbols and expiry types
4. Provide regime-aware recommendations

When answering:
- Be precise with numbers (use 2 decimal places for prices, 4 for ratios)
- Always mention the analysis period and regime context
- Warn about risks when relevant
- Format tables using markdown when showing multiple data points
- If data is insufficient, say so clearly

Key concepts:
- CE% = Call option sold at X% above spot price
- PE% = Put option sold at X% below spot price
- Win Rate = % of expiries where the strategy was profitable
- Expected Value = average P&L per trade
- Probability Worthless = chance both options expire worthless (best case for seller)
"""


class RAGEngine:
    """Orchestrates RAG-based question answering."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.sql_agent = SQLAgent(db)
        self.llm = get_llm_provider()

    async def answer(
        self,
        question: str,
        session_id: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> dict:
        """
        Answer a user question using RAG.

        Returns:
            {
                "response": str,
                "sql_query": str | None,
                "sources": list[str],
                "session_id": str,
            }
        """
        sid = session_id or str(uuid.uuid4())

        # Store user message
        user_msg = ChatHistory(
            session_id=uuid.UUID(sid),
            user_id=user_id,
            role="user",
            content=question,
        )
        self.db.add(user_msg)

        # Classify and route
        query_type = self._classify_question(question)
        logger.info(f"Question classified as: {query_type}", question=question[:100])

        sql_query = None
        context = ""
        sources = []

        if query_type == "sql":
            # Route to SQL agent
            sql_result = await self.sql_agent.generate_and_execute(question)
            sql_query = sql_result["sql"]

            if sql_result["error"]:
                context = f"SQL Error: {sql_result['error']}"
            else:
                # Format results as context
                if sql_result["results"]:
                    headers = sql_result["columns"]
                    rows = sql_result["results"]
                    table = " | ".join(headers) + "\n"
                    table += " | ".join(["---"] * len(headers)) + "\n"
                    for row in rows[:20]:  # Limit context
                        table += " | ".join(str(v) for v in row) + "\n"
                    context = f"Query results:\n{table}"
                    sources.append("PostgreSQL database query")
                else:
                    context = "No results found for the query."

        elif query_type == "explain":
            # Use pre-built knowledge context
            context = self._get_explanation_context(question)
            sources.append("Platform knowledge base")

        else:
            # General question — try SQL first, then knowledge
            sql_result = await self.sql_agent.generate_and_execute(question)
            sql_query = sql_result["sql"]

            if sql_result["results"]:
                headers = sql_result["columns"]
                rows = sql_result["results"]
                table = " | ".join(headers) + "\n"
                for row in rows[:10]:
                    table += " | ".join(str(v) for v in row) + "\n"
                context = f"Data:\n{table}"
                sources.append("PostgreSQL database query")
            else:
                context = self._get_explanation_context(question)
                sources.append("Platform knowledge base")

        # Generate response with LLM
        prompt = self._build_prompt(question, context)
        response = await self.llm.generate(prompt, system_prompt=SYSTEM_PROMPT)

        # Store assistant response
        assistant_msg = ChatHistory(
            session_id=uuid.UUID(sid),
            user_id=user_id,
            role="assistant",
            content=response,
            sql_query=sql_query,
            chat_metadata={"sources": sources, "query_type": query_type},
        )
        self.db.add(assistant_msg)
        await self.db.flush()

        return {
            "response": response,
            "sql_query": sql_query,
            "sources": sources,
            "session_id": sid,
        }

    def _classify_question(self, question: str) -> str:
        """Classify question type for routing."""
        q_lower = question.lower()

        for keyword in EXPLAIN_KEYWORDS:
            if keyword in q_lower:
                return "explain"

        for keyword in SQL_KEYWORDS:
            if keyword in q_lower:
                return "sql"

        return "general"

    def _build_prompt(self, question: str, context: str) -> str:
        """Build the prompt for the LLM."""
        return f"""Based on the following data/context, answer the user's question.

Context:
{context}

User Question: {question}

Provide a clear, actionable answer. If the data shows specific numbers, include them.
If you're making a recommendation, explain the reasoning.
"""

    def _get_explanation_context(self, question: str) -> str:
        """Get pre-built explanation context for common topics."""
        q_lower = question.lower()

        if "sharpe" in q_lower:
            return (
                "The Sharpe Ratio measures risk-adjusted returns. "
                "It's calculated as (mean return - risk-free rate) / standard deviation of returns, "
                "annualized. Higher is better. Above 1.0 is good, above 2.0 is excellent."
            )
        elif "kelly" in q_lower:
            return (
                "The Kelly Criterion determines the optimal fraction of capital to risk. "
                "Formula: K = W - (1-W)/B, where W = win rate and B = avg win / avg loss ratio. "
                "Values above 0.2 suggest a strong edge."
            )
        elif "regime" in q_lower:
            return (
                "Market regimes are classified as: "
                "Bull (20-day return > +3%), Bear (< -3%), Sideways (-3% to +3%). "
                "VIX regimes: Low (< 15), Medium (15-25), High (> 25). "
                "Optimal selling bands change significantly across regimes."
            )
        elif "drawdown" in q_lower:
            return (
                "Maximum Drawdown is the largest peak-to-trough decline in cumulative P&L. "
                "It represents the worst-case loss scenario. Lower drawdown is better for option sellers."
            )
        else:
            return (
                "The platform analyzes historical option chain data to find optimal CE/PE selling percentages. "
                "It evaluates 169 CE/PE combinations (13x13) across different market regimes and VIX levels "
                "to identify strategies with the highest expected value and win rate."
            )
