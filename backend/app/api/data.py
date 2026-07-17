from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..db.base import get_db
from ..db.models import User, Kid, ChatSession, Message, ChatAnalytics
from ..core.security import verify_password
from ..core.logger import get_logger
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from .auth import get_current_user_id, get_current_kid_id

logger = get_logger(__name__)
router = APIRouter()


class KidResponse(BaseModel):
    id: int
    username: str
    is_active_access: bool = False
    subscription_status: bool = False
    subscription_expiry: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: int
    title: Optional[str] = "New Chat"
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/parent/dashboard/kids", response_model=List[KidResponse])
def get_kids(db: Session = Depends(get_db), parent_id: int = Depends(get_current_user_id)):
    return db.query(Kid).filter(Kid.parent_id == parent_id).all()


@router.get("/kid/chats", response_model=List[ChatSessionResponse])
def get_my_chats(db: Session = Depends(get_db), kid_id: int = Depends(get_current_kid_id)):
    return (
        db.query(ChatSession)
        .filter(ChatSession.kid_id == kid_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


@router.get("/parent/kid/{kid_id}/chats", response_model=List[ChatSessionResponse])
def get_kid_chats_for_parent(kid_id: int, db: Session = Depends(get_db), parent_id: int = Depends(get_current_user_id)):
    kid = db.query(Kid).filter(Kid.id == kid_id, Kid.parent_id == parent_id).first()
    if not kid:
        raise HTTPException(status_code=403, detail="Kid not found or access denied")
    return db.query(ChatSession).filter(ChatSession.kid_id == kid_id).all()


@router.get("/kid/chats/{chat_id}/messages")
def get_chat_history(
    chat_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    kid_id: int = Depends(get_current_kid_id),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == chat_id, ChatSession.kid_id == kid_id
    ).first()
    if not session:
        raise HTTPException(status_code=403, detail="Chat not found or access denied")

    msgs = (
        db.query(Message)
        .filter(Message.session_id == chat_id)
        .order_by(Message.timestamp)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in msgs]


def _verify_parent_owns_chat(chat_id: int, parent_id: int, db: Session) -> ChatSession:
    """Raises 403 if the chat does not belong to any of this parent's kids."""
    session = (
        db.query(ChatSession)
        .join(Kid, ChatSession.kid_id == Kid.id)
        .filter(ChatSession.id == chat_id, Kid.parent_id == parent_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=403, detail="Chat not found or access denied")
    return session


def _generate_stats(chat_id: int, language: str, db: Session) -> dict:
    """Core analytics logic — no auth, called only from within this module."""
    cached = db.query(ChatAnalytics).filter(ChatAnalytics.session_id == chat_id).first()

    if cached and cached.language == language:
        return {
            "chat_id": chat_id,
            "message_count": db.query(Message).filter(Message.session_id == chat_id).count(),
            "mastery_score": cached.mastery_score,
            "topics": cached.topics,
            "summary": cached.summary,
            "cached": True,
            "last_updated": cached.last_updated,
        }

    # Cap at 200 messages to bound memory and LLM token use
    msgs = (
        db.query(Message)
        .filter(Message.session_id == chat_id)
        .order_by(Message.timestamp)
        .limit(200)
        .all()
    )

    if len(msgs) < 2:
        return {
            "chat_id": chat_id,
            "message_count": len(msgs),
            "mastery_score": 0,
            "topics": [],
            "summary": "Not enough interaction yet.",
            "cached": False,
        }

    history_text = "\n".join([f"Student: {m.content}" for m in msgs if m.role == "user"])

    from ..services.ai import client
    try:
        context_text = history_text[-6000:]
        analysis_prompt = f"""
        Analyze this student's learning session. Focus on HOW the student asks questions to evaluate their understanding.
        The summary MUST be written in {language}.

        Evaluation Criteria:
        - Question Quality: Are questions specific, well-formed, and show critical thinking?
        - Depth of Inquiry: Does the student ask follow-up questions?
        - Conceptual Understanding: Do questions show grasp of fundamentals?

        Required JSON Structure:
        {{
            "mastery_score": (integer 0-100 based on question quality and depth),
            "topics": [list of EXACTLY 5 specific educational topics covered, no more, no less],
            "summary": "A detailed paragraph in {language} analyzing the student's question-asking ability, learning approach, strengths, and areas for improvement."
        }}

        Student Questions:
        {context_text}
        """

        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": analysis_prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
        )
        import json
        result = json.loads(completion.choices[0].message.content)

        topics = result.get("topics", ["General"])[:5]
        while len(topics) < 5:
            topics.append("General Study")

        mastery_score = result.get("mastery_score", 50)
        summary = result.get("summary", "Analysis completed.")

        if cached:
            cached.mastery_score = mastery_score
            cached.topics = topics
            cached.summary = summary
            cached.language = language
            cached.last_updated = datetime.utcnow()
        else:
            cached = ChatAnalytics(
                session_id=chat_id,
                mastery_score=mastery_score,
                topics=topics,
                summary=summary,
                language=language,
            )
            db.add(cached)

        db.commit()

        return {
            "chat_id": chat_id,
            "message_count": len(msgs),
            "mastery_score": mastery_score,
            "topics": topics,
            "summary": summary,
            "cached": False,
        }

    except Exception:
        logger.exception(f"Stats generation failed for chat {chat_id}")
        return {
            "chat_id": chat_id,
            "message_count": len(msgs),
            "mastery_score": 50,
            "topics": ["Analysis Failed"],
            "summary": "Could not analyze chat.",
        }


@router.get("/parent/chat/{chat_id}/stats")
def get_chat_stats(
    chat_id: int,
    language: str = "English",
    db: Session = Depends(get_db),
    parent_id: int = Depends(get_current_user_id),
):
    _verify_parent_owns_chat(chat_id, parent_id, db)
    return _generate_stats(chat_id, language, db)


@router.post("/parent/chat/{chat_id}/stats/refresh")
def refresh_chat_stats(
    chat_id: int,
    language: str = "English",
    db: Session = Depends(get_db),
    parent_id: int = Depends(get_current_user_id),
):
    _verify_parent_owns_chat(chat_id, parent_id, db)
    db.query(ChatAnalytics).filter(ChatAnalytics.session_id == chat_id).delete()
    db.commit()
    return _generate_stats(chat_id, language, db)


from ..services.pdf_generator import generate_practice_paper


@router.post("/reports/generate/{chat_id}")
def generate_report(
    chat_id: int,
    db: Session = Depends(get_db),
    parent_id: int = Depends(get_current_user_id),
):
    _verify_parent_owns_chat(chat_id, parent_id, db)

    msgs = (
        db.query(Message)
        .filter(Message.session_id == chat_id)
        .order_by(Message.timestamp)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in msgs]

    qp_path, key_path = generate_practice_paper(history, chat_id)

    base_url = "/static/reports"
    return {
        "message": "Reports generated successfully",
        "qp_url": f"{base_url}/{chat_id}_qp.pdf",
        "key_url": f"{base_url}/{chat_id}_key.pdf",
    }
