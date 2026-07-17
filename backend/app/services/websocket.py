import os
import http.cookies as http_cookies
import socketio
from typing import Dict
from jose import JWTError, jwt
from ..db.base import SessionLocal
from ..db.models import Message, ChatSession, Kid
from .ai import generate_response
from ..core.security import SECRET_KEY, ALGORITHM
from ..core.logger import get_logger

logger = get_logger(__name__)

_cors = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",") if o.strip()]
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=_cors)

# Server-validated mapping: socket sid → kid_id (never trust client-supplied kid_id)
authenticated_kids: Dict[str, int] = {}


@sio.event
async def connect(sid, environ, auth):
    # 1. Try httpOnly cookie (browser client with withCredentials: true)
    token = None
    cookie_header = environ.get('HTTP_COOKIE', '')
    if cookie_header:
        try:
            jar = http_cookies.SimpleCookie()
            jar.load(cookie_header)
            if 'access_token' in jar:
                token = jar['access_token'].value
        except Exception:
            pass

    # 2. Fall back to auth dict (non-browser clients / backward compat)
    if not token and auth:
        token = auth.get('token')

    if not token:
        logger.warning(f"Rejected unauthenticated socket connection: {sid}")
        return False

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        kid_id = payload.get("id")
        user_type = payload.get("type")
        if not kid_id or user_type != "kid":
            logger.warning(f"Rejected non-kid token for sid {sid} (type={user_type})")
            return False
        authenticated_kids[sid] = kid_id
        logger.info(f"Kid {kid_id} connected: {sid}")
    except JWTError as e:
        logger.warning(f"Invalid token for sid {sid}: {e}")
        return False


@sio.event
async def disconnect(sid):
    kid_id = authenticated_kids.pop(sid, None)
    logger.info(f"Kid {kid_id} disconnected: {sid}")


@sio.event
async def chat_message(sid, data):
    # Use server-validated kid_id — never trust data.get('kid_id') from client
    kid_id = authenticated_kids.get(sid)
    if not kid_id:
        logger.warning(f"Unauthenticated chat_message from {sid}")
        return

    user_message = data.get('message')
    session_id = data.get('session_id')

    if not user_message:
        return

    db = SessionLocal()
    try:
        chat_session = None

        if session_id:
            # Verify the session actually belongs to this kid before using it
            chat_session = db.query(ChatSession).filter(
                ChatSession.id == session_id,
                ChatSession.kid_id == kid_id,
            ).first()

        if not chat_session:
            chat_session = ChatSession(kid_id=kid_id, title=user_message[:30] + "...")
            db.add(chat_session)
            db.commit()
            db.refresh(chat_session)

        db_msg = Message(session_id=chat_session.id, role="user", content=user_message)
        db.add(db_msg)
        db.commit()

        # Limit history to 20 messages to avoid token exhaustion
        history_objs = (
            db.query(Message)
            .filter(Message.session_id == chat_session.id)
            .order_by(Message.timestamp)
            .limit(20)
            .all()
        )
        chat_history = [{"role": m.role, "content": m.content} for m in history_objs]

        ai_text = generate_response(kid_id, user_message, chat_history, db)

        ai_msg = Message(session_id=chat_session.id, role="ai", content=ai_text)
        db.add(ai_msg)
        db.commit()

        await sio.emit('response', {
            'data': ai_text,
            'session_id': chat_session.id,
            'title': chat_session.title,
        }, room=sid)

    except Exception as e:
        logger.exception(f"Chat error for kid {kid_id}")
        await sio.emit('response', {'data': "I'm having a bit of trouble. Can you say that again?"}, room=sid)
    finally:
        db.close()


async def notify_kid(kid_id: int, event: str, payload: dict):
    sid = next((s for s, k in authenticated_kids.items() if k == kid_id), None)
    if sid:
        await sio.emit(event, payload, room=sid)
