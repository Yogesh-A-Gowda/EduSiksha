from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import uvicorn
import os
import socketio
import asyncio
from dotenv import load_dotenv
from .api import auth, data, chat
from .services.websocket import sio
from .services.ai import cleanup_expired_files
from .db.base import SessionLocal
from .core.rate_limit import limiter
from .core.logger import get_logger

load_dotenv()

logger = get_logger(__name__)

app = FastAPI(title="EduGuard API", version="1.0.0")

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — set CORS_ORIGINS env var to a comma-separated list for production
# e.g. CORS_ORIGINS=https://app.eduguard.com,https://admin.eduguard.com
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(data.router, tags=["Data"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])

from .api import payment
app.include_router(payment.router, prefix="/payment", tags=["Payment"])

from fastapi.staticfiles import StaticFiles
if not os.path.exists("static/reports"):
    os.makedirs("static/reports")
app.mount("/static/reports", StaticFiles(directory="static/reports"), name="reports")

socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/socket.io',
)


async def cleanup_task():
    while True:
        try:
            db = SessionLocal()
            cleanup_expired_files(db)
            db.close()
        except Exception:
            logger.exception("Cleanup task failed")
        await asyncio.sleep(86400)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_task())
    logger.info(f"EduGuard API started. CORS origins: {origins}")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def read_root():
    return {"message": "Welcome to EduGuard API", "status": "running"}


if __name__ == "__main__":
    uvicorn.run("app.main:socket_app", host="0.0.0.0", port=8000, reload=True)
