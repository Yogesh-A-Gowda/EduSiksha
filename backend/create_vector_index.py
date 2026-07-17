"""
Run once after the database is created to add an HNSW index on document embeddings.
This speeds up cosine similarity search from O(n) to O(log n) at scale.

Usage:
    cd backend
    python create_vector_index.py
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/eduguard")

# CONCURRENTLY cannot run inside a transaction — use autocommit
engine = create_engine(DATABASE_URL, isolation_level="AUTOCOMMIT")

with engine.connect() as conn:
    print("Creating HNSW index on documents.embedding ...")
    conn.execute(text("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_embedding_hnsw
        ON documents
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """))
    print("Done. Cosine similarity queries are now indexed.")
