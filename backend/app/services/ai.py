import os
import requests
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.models import Message, Document
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pgvector.sqlalchemy import Vector
from dotenv import load_dotenv
# ... imports ...
from groq import Groq
from sentence_transformers import SentenceTransformer

# Load environment
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

# Initialize Local Embedding Model (Runs on CPU, ~90MB)
# 'all-MiniLM-L6-v2' is standard, fast, and 384 dimensions.
# 'nomic-embed-text' used earlier was 768. 
# WARNING: Changing dimensions requires DB wipe or vector column update.
# For simplicity in this dev phase, we assume DB recreation or we use a model with same dims if possible.
# But 'nomic' is unique. Let's stick to standard 384 dim model and advise user to recreate DB if needed.
# Actually, pgvector definition in models.py says 768. 
# We should use 'all-mpnet-base-v2' (768 dims) to match existing DB schema!
print("Loading Embedding Model (this may take a moment)...")
embed_model = SentenceTransformer('all-mpnet-base-v2') 

GUARDRAIL_PROMPT = """You are an educational AI assistant for kids. 
You must ONLY answer questions related to school subjects (Math, Science, History, Coding, language, etc.).
If the user asks about anything else (games, movies, entertainment, illicit topics), 
kindly reply: "This topic is outside our educational context. Let’s get back to your studies!"
Do not answer the non-educational question.
Also, keep answers simple and encouraging.
Use Code blocks for code.
"""

def get_embedding(text: str) -> List[float]:
    try:
        # Local inference
        return embed_model.encode(text).tolist()
    except Exception as e:
        print(f"Embedding Error: {e}")
        return []

def generate_response(kid_id: int, message: str, chat_history: List[dict], db: Session) -> str:
    # 1. RAG Retrieval (pgvector)
    query_vec = get_embedding(message)
    context_text = ""
    
    if query_vec:
        # Cosine similarity search
        results = db.query(Document).order_by(Document.embedding.cosine_distance(query_vec)).limit(2).all()
        relevant_docs = [doc.content for doc in results if doc.content]
        context_text = "\n".join(relevant_docs)

    # 2. Context Construction
    messages_payload = [{"role": "system", "content": GUARDRAIL_PROMPT}]
    
    if context_text:
        messages_payload.append({"role": "system", "content": f"Use this context to answer if relevant:\n{context_text}"})
        
    for msg in chat_history:
        role = "assistant" if msg['role'] == "ai" else msg['role']
        messages_payload.append({"role": role, "content": msg['content']})
        
    messages_payload.append({"role": "user", "content": message})
    
    # 3. Call Groq
    try:
        chat_completion = client.chat.completions.create(
            messages=messages_payload,
            model="llama-3.3-70b-versatile", # Fast and smart
            temperature=0.5,
            max_tokens=500,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Groq API Error: {e}")
        return "I'm having trouble connecting to GroqCloud. Please check your API Key."

def process_file_upload(file_path: str, session_id: int, db: Session):
    """
    Process uploaded file with enhanced OCR and multi-format support
    Supports: Images (OCR), PDFs (with OCR fallback), Excel, PowerPoint, Word, TXT
    """
    from ..services.document_processor import process_document
    
    # Get file extension
    file_ext = os.path.splitext(file_path)[1][1:].lower()  # Remove the dot
    
    try:
        # Process document with new processor
        full_text, chunks = process_document(file_path, file_ext)
        
        if not chunks:
            print(f"Warning: No text extracted from {file_path}")
            return 0
        
        # Embed & Store in DB
        processed_count = 0
        for chunk_text in chunks:
            vec = get_embedding(chunk_text)
            if vec:
                new_doc = Document(
                    session_id=session_id,
                    file_path=file_path,
                    file_name=os.path.basename(file_path),
                    content=chunk_text,
                    embedding=vec,
                    is_active=True
                )
                db.add(new_doc)
                processed_count += 1
                
        db.commit()
        print(f"Processed {processed_count} chunks from {file_path}")
        return processed_count
        
    except Exception as e:
        print(f"File processing error: {e}")
        import traceback
        traceback.print_exc()
        return 0

def cleanup_expired_files(db: Session):
    cutoff_date = datetime.utcnow() - timedelta(days=15)
    expired_docs = db.query(Document).filter(Document.created_at < cutoff_date, Document.is_active == True).all()
    
    for doc in expired_docs:
        # 1. Delete actual file from disk
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
        
        # 2. Mark DB as inactive (embeddings remain but filtered out by logic if we check is_active)
        # Or we can nullify the embedding to save space
        doc.embedding = None 
        doc.is_active = False
        db.add(doc)
    
    db.commit()
