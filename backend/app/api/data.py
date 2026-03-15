from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.base import get_db
from ..db.models import User, Kid, ChatSession, Message
from ..core.security import verify_password 
# Need a proper dependency to get current user from token
# For now, assuming endpoints are protected
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from .auth import get_current_user_id

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
    kids = db.query(Kid).filter(Kid.parent_id == parent_id).all()
    return kids

from .auth import get_current_user_id, get_current_kid_id

# ... imports ...

@router.get("/kid/chats", response_model=List[ChatSessionResponse])
def get_my_chats(db: Session = Depends(get_db), kid_id: int = Depends(get_current_kid_id)):
    chats = db.query(ChatSession).filter(ChatSession.kid_id == kid_id).order_by(ChatSession.created_at.desc()).all()
    return chats

@router.get("/parent/kid/{kid_id}/chats", response_model=List[ChatSessionResponse])
def get_kid_chats_for_parent(kid_id: int, db: Session = Depends(get_db), parent_id: int = Depends(get_current_user_id)):
    # Verify ownership
    kid = db.query(Kid).filter(Kid.id == kid_id, Kid.parent_id == parent_id).first()
    if not kid:
        raise HTTPException(status_code=404, detail="Kid not found or access denied")
        
    chats = db.query(ChatSession).filter(ChatSession.kid_id == kid_id).all()
    return chats

@router.get("/kid/chats/{chat_id}/messages")
def get_chat_history(chat_id: int, db: Session = Depends(get_db), kid_id: int = Depends(get_current_kid_id)):
    # Verify ownership
    session = db.query(ChatSession).filter(ChatSession.id == chat_id, ChatSession.kid_id == kid_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    msgs = db.query(Message).filter(Message.session_id == chat_id).order_by(Message.timestamp).all()
    return [{"role": m.role, "content": m.content} for m in msgs]

@router.get("/parent/chat/{chat_id}/stats")
def get_chat_stats(chat_id: int, language: str = "English", db: Session = Depends(get_db)):
    from ..db.models import ChatAnalytics
    
    session = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if cached analytics exists
    cached = db.query(ChatAnalytics).filter(ChatAnalytics.session_id == chat_id).first()
    
    if cached and cached.language == language:
        # Return cached data
        return {
            "chat_id": chat_id,
            "message_count": db.query(Message).filter(Message.session_id == chat_id).count(),
            "mastery_score": cached.mastery_score,
            "topics": cached.topics,
            "summary": cached.summary,
            "cached": True,
            "last_updated": cached.last_updated
        }
    
    # If no cache or language mismatch, generate new analysis
    msgs = db.query(Message).filter(Message.session_id == chat_id).order_by(Message.timestamp).all()
    
    if len(msgs) < 2:
        return {
            "chat_id": chat_id,
            "message_count": len(msgs),
            "mastery_score": 0,
            "topics": [],
            "summary": "Not enough interaction yet.",
            "cached": False
        }
    
    # Build history focusing on student questions
    student_questions = [m.content for m in msgs if m.role == "user"]
    history_text = "\n".join([f"Student: {m.content}" for m in msgs if m.role == "user"])
    
    # Analyze with AI
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
            response_format={"type": "json_object"}
        )
        import json
        result = json.loads(completion.choices[0].message.content)
        
        # Ensure exactly 5 topics
        topics = result.get("topics", ["General"])[:5]
        while len(topics) < 5:
            topics.append("General Study")
        
        mastery_score = result.get("mastery_score", 50)
        summary = result.get("summary", "Analysis completed.")
        
        # Cache the results
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
                language=language
            )
            db.add(cached)
        
        db.commit()
        
        return {
            "chat_id": chat_id,
            "message_count": len(msgs),
            "mastery_score": mastery_score,
            "topics": topics,
            "summary": summary,
            "cached": False
        }
    except Exception as e:
        print(f"Stats Error: {e}")
        return {
            "chat_id": chat_id,
            "message_count": len(msgs),
            "mastery_score": 50,
            "topics": ["Analysis Failed"],
            "summary": "Could not analyze chat."
        }

@router.post("/parent/chat/{chat_id}/stats/refresh")
def refresh_chat_stats(chat_id: int, language: str = "English", db: Session = Depends(get_db)):
    """Force regenerate chat analytics"""
    from ..db.models import ChatAnalytics
    
    # Delete existing cache
    db.query(ChatAnalytics).filter(ChatAnalytics.session_id == chat_id).delete()
    db.commit()
    
    # Call the regular stats endpoint which will regenerate
    return get_chat_stats(chat_id, language, db)

from ..services.pdf_generator import generate_practice_paper

@router.post("/reports/generate/{chat_id}")
def generate_report(chat_id: int, db: Session = Depends(get_db)):
    # Get Chat History
    msgs = db.query(Message).filter(Message.session_id == chat_id).order_by(Message.timestamp).all()
    history = [{"role": m.role, "content": m.content} for m in msgs]

    # Generate PDF
    qp_path, key_path = generate_practice_paper(history, chat_id)
    
    # Return URLs (assuming static folder is served)
    base_url = "/static/reports"
    return {
        "message": "Reports generated successfully",
        "qp_url": f"{base_url}/{chat_id}_qp.pdf",
        "key_url": f"{base_url}/{chat_id}_key.pdf"
    }
