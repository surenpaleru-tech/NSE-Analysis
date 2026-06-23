"""
Chat API endpoints — AI chatbot with RAG and SQL agent.
Updated to use the full RAG engine.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models import ChatHistory
from app.chatbot.rag_engine import RAGEngine

router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message request."""
    message: str
    session_id: Optional[str] = None
    user_id: Optional[int] = None


class ChatResponse(BaseModel):
    """Chat message response."""
    session_id: str
    response: str
    sql_query: Optional[str] = None
    sources: list[str] = []


@router.post("/message", response_model=ChatResponse)
async def send_message(
    msg: ChatMessage,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the AI chatbot.
    Uses RAG (Retrieval-Augmented Generation) with SQL agent to answer
    questions about NSE options recommendations and market analytics.
    """
    rag = RAGEngine(db)
    result = await rag.answer(
        question=msg.message,
        session_id=msg.session_id,
        user_id=msg.user_id,
    )
    await db.commit()

    return ChatResponse(
        session_id=result["session_id"],
        response=result["response"],
        sql_query=result.get("sql_query"),
        sources=result.get("sources", []),
    )


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, le=200),
):
    """Retrieve chat history for a session."""
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    query = (
        select(ChatHistory)
        .where(ChatHistory.session_id == sid)
        .order_by(ChatHistory.created_at)
        .limit(limit)
    )
    result = await db.execute(query)
    messages = result.scalars().all()

    return {
        "session_id": session_id,
        "count": len(messages),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "sql_query": m.sql_query,
                "metadata": m.chat_metadata,
                "timestamp": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@router.delete("/history/{session_id}")
async def clear_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Clear chat history for a session."""
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    from sqlalchemy import delete
    await db.execute(delete(ChatHistory).where(ChatHistory.session_id == sid))
    await db.commit()
    return {"status": "cleared", "session_id": session_id}
