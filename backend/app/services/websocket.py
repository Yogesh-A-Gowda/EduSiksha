import socketio
from typing import Dict
from ..db.base import SessionLocal
from ..db.models import Message, ChatSession, Kid
from .ai import generate_response

# Create a Socket.IO server
# In production, use Redis for message queue to support distributed servers
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Map kid_id to socket_sid for direct messaging and presence
kid_sessions: Dict[int, str] = {}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    # Authenticaton logic should happen here (extract token from query params or headers)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    # Remove from kid_sessions if present
    for kid_id, session_sid in list(kid_sessions.items()):
        if session_sid == sid:
            del kid_sessions[kid_id]
            # Emit 'presence' update to parents?
            break

@sio.event
async def chat_message(sid, data):
    """
    data = {
        "kid_id": 123,
        "message": "Hello AI",
        "file_id": optional
    }
    """
    print(f"Message from {sid}: {data}")
    
    kid_id = data.get('kid_id')
    user_message = data.get('message')
    session_id = data.get('session_id') # New field from frontend
    
    if not kid_id or not user_message:
        return

    db = SessionLocal()
    try:
        chat_session = None

        # 1. If session_id provided, try to find it
        if session_id:
             chat_session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.kid_id == kid_id).first()

        # 2. If no session found/provided, OR logic dictates "New Chat", create new?
        # Current Frontend: "New Chat" sets activeChatId = null -> session_id = null here.
        # So if session_id is None, we should create NEW, NOT find latest.
        # BUT: For initial page load, maybe we want latest? 
        # Actually, standard chat app behavior: 
        # - Click "New Chat" -> UI clears -> User types -> Send session_id=null -> Create NEW.
        # - Click Old Chat -> UI loads -> User types -> Send session_id=123 -> Append to 123.
        # Logic: If session_id is None, create NEW session.
        
        if not chat_session:
             # Create new session
             chat_session = ChatSession(kid_id=kid_id, title=user_message[:30]+"...") # Title from first message
             db.add(chat_session)
             db.commit()
             db.refresh(chat_session)
            
        # 2. Save User Message
        db_msg = Message(session_id=chat_session.id, role="user", content=user_message)
        db.add(db_msg)
        db.commit()
        
        # 3. Get History for Context
        history_objs = db.query(Message).filter(Message.session_id == chat_session.id).order_by(Message.timestamp).limit(100).all()
        chat_history = [{"role": m.role, "content": m.content} for m in history_objs]
        
        # 4. Generate AI details
        ai_text = generate_response(kid_id, user_message, chat_history, db)
        
        # 5. Save AI Message
        ai_msg = Message(session_id=chat_session.id, role="ai", content=ai_text)
        db.add(ai_msg)
        db.commit()
        
        # 6. Emit Response
        await sio.emit('response', {
            'data': ai_text, 
            'session_id': chat_session.id,
            'title': chat_session.title
        }, room=sid)
        
    except Exception as e:
        print(f"Chat Error: {e}")
        await sio.emit('response', {'data': "I'm having a bit of trouble. Can you say that again?"}, room=sid)
    finally:
        db.close()

async def notify_kid(kid_id: int, event: str, payload: dict):
    if kid_id in kid_sessions:
        await sio.emit(event, payload, room=kid_sessions[kid_id])
