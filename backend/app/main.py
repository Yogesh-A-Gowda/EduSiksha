from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import socketio
import asyncio
from dotenv import load_dotenv
from .api import auth, data, chat
from .services.websocket import sio
from .services.ai import cleanup_expired_files 
from .db.base import  SessionLocal

load_dotenv()

app = FastAPI(title="EduGuard API", version="1.0.0")

# CORS Setup
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(data.router, tags=["Data"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])

from .api import payment
app.include_router(payment.router, prefix="/payment", tags=["Payment"])

# Mount static files BEFORE creating socket_app
from fastapi.staticfiles import StaticFiles
if not os.path.exists("static/reports"):
    os.makedirs("static/reports")
app.mount("/static/reports", StaticFiles(directory="static/reports"), name="reports")

# Mount Socket.IO - this must be done AFTER all routes and mounts are configured
# Use socketio_path to avoid conflicts with FastAPI routes
socket_app = socketio.ASGIApp(
    sio, 
    other_asgi_app=app,
    socketio_path='/socket.io'
)

async def cleanup_task():
    while True:
        try:
            db = SessionLocal()
            cleanup_expired_files(db)
            db.close()
        except Exception as e:
            print(f"Cleanup Error: {e}")
        await asyncio.sleep(86400) # Run once a day

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_task())

@app.get("/")
def read_root():
    return {"message": "Welcome to EduGuard API", "status": "running"}

if __name__ == "__main__":
    uvicorn.run("app.main:socket_app", host="0.0.0.0", port=8000, reload=True)
