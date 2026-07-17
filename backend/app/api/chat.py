import asyncio
import os
import pathlib
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile
from ..db.base import get_db, SessionLocal
from ..db.models import ChatSession
from ..services.ai import process_file_upload
from ..api.auth import get_current_kid_id
from ..core.rate_limit import limiter
from ..core.logger import get_logger
from sqlalchemy.orm import Session

logger = get_logger(__name__)
router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.pdf', '.docx', '.xlsx', '.pptx', '.txt'}

ALLOWED_MIME_TYPES = {
    'image/png',
    'image/jpeg',
    'image/bmp',
    'image/tiff',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
}


async def _run_processing(file_path: str, session_id: int, kid_id: int):
    """
    Runs OCR/embedding in a thread pool so the event loop stays free,
    then notifies the kid's socket when done.
    """
    from ..services.websocket import sio, authenticated_kids

    db = SessionLocal()
    try:
        chunk_count = await asyncio.to_thread(process_file_upload, file_path, session_id, db)
        kid_sid = next((s for s, k in authenticated_kids.items() if k == kid_id), None)
        if kid_sid:
            await sio.emit('upload_complete', {
                'filename': os.path.basename(file_path),
                'chunks': chunk_count,
                'session_id': session_id,
            }, room=kid_sid)
    except Exception:
        logger.exception(f"Background processing failed for {file_path}")
        kid_sid = next((s for s, k in authenticated_kids.items() if k == kid_id), None)
        if kid_sid:
            await sio.emit('upload_error', {
                'filename': os.path.basename(file_path),
                'session_id': session_id,
            }, room=kid_sid)
    finally:
        db.close()


@router.post("/upload")
@limiter.limit("5/minute")
async def upload_file(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: int = Form(...),
    kid_id: int = Depends(get_current_kid_id),
    db: Session = Depends(get_db),
):
    # --- Input validation ---
    original_name = file.filename or ""
    ext = pathlib.Path(original_name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext or 'unknown'}' not allowed")

    declared_mime = (file.content_type or "").split(";")[0].strip().lower()
    if declared_mime and declared_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Content-Type not allowed")

    # Read with a one-byte-over cap to detect oversized files without loading them fully
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    # --- Ownership check ---
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.kid_id == kid_id,
    ).first()
    if not session:
        raise HTTPException(status_code=403, detail="Session not found or access denied")

    # --- Save with a server-generated name (no path traversal via client filename) ---
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_location = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_location, "wb") as f:
        f.write(contents)

    background_tasks.add_task(_run_processing, file_location, session_id, kid_id)
    logger.info(f"Upload queued for kid {kid_id}, session {session_id}: {original_name!r} -> {safe_name}")
    return {"filename": original_name, "status": "processing"}
