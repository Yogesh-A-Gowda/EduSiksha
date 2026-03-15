from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
from datetime import datetime
from .base import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    kids = relationship("Kid", back_populates="parent")

class Kid(Base):
    __tablename__ = "kids"
    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    subscription_status = Column(Boolean, default=False)
    subscription_expiry = Column(DateTime, nullable=True)
    is_active_access = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = relationship("User", back_populates="kids")
    chat_sessions = relationship("ChatSession", back_populates="kid")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    kid_id = Column(Integer, ForeignKey("kids.id"))
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True) # 1 year logic
    is_active = Column(Boolean, default=True)

    kid = relationship("Kid", back_populates="chat_sessions")
    messages = relationship("Message", back_populates="session")
    documents = relationship("Document", back_populates="session")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String, nullable=False) # 'user' or 'ai'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    content = Column(Text, nullable=True) # Store chunk text
    embedding = Column(Vector(768)) # Embedding vector for Gemma2/Nomic (768 dim)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True) # False after 15 days

    session = relationship("ChatSession", back_populates="documents")

class ChatAnalytics(Base):
    __tablename__ = "chat_analytics"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), unique=True, nullable=False)
    mastery_score = Column(Integer, default=0)
    topics = Column(JSONB)  # Store as JSON array
    summary = Column(Text)
    language = Column(String, default="English")
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    session = relationship("ChatSession", backref="analytics")
