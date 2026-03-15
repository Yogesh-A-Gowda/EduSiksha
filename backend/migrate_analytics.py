"""
Migration script to add chat_analytics table
Run this after updating models.py
"""
from app.db.base import engine
from app.db.models import Base

print("Creating chat_analytics table...")
Base.metadata.create_all(bind=engine)
print("Migration complete!")
