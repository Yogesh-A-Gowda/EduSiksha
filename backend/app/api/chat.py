from fastapi import APIRouter, UploadFile, File, Form, Depends
import shutil
import os
from datetime import datetime
from ..db.base import get_db
from ..db.models import Document
from ..services.ai import process_file_upload
from sqlalchemy.orm import Session

router = APIRouter()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    session_id: int = Form(...),
    db: Session = Depends(get_db)
):
    # Save file locally
    file_location = f"{UPLOAD_DIR}/{datetime.now().timestamp()}_{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    
    # Process RAG
    chunk_count = process_file_upload(file_location, session_id, db)
    
    # Save to DB
    new_doc = Document(
        session_id=session_id,
        file_path=file_location,
        file_name=file.filename,
        is_active=True
    )
    db.add(new_doc)
    db.commit()
    
    return {"filename": file.filename, "chunks_processed": chunk_count, "status": "indexed"}
