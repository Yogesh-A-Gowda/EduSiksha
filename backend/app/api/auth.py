import os
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..db.base import get_db
from ..db.models import User, Kid
from ..core.security import (
    get_password_hash, verify_password, create_access_token,
    ALGORITHM, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..core.rate_limit import limiter
from pydantic import BaseModel
from typing import Optional
from jose import JWTError, jwt

router = APIRouter()

# Set to true via COOKIE_SECURE=true env var in production (requires HTTPS)
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


# ── Token extraction ────────────────────────────────────────────────────────

def _get_token(
    access_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> str:
    """Read JWT from httpOnly cookie first, fall back to Authorization header."""
    if access_token:
        return access_token
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


def get_current_user_id(token: str = Depends(_get_token)) -> int:
    payload = _decode(token)
    user_id = payload.get("id")
    if user_id is None or payload.get("type") != "parent":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    return user_id


def get_current_kid_id(token: str = Depends(_get_token)) -> int:
    payload = _decode(token)
    user_id = payload.get("id")
    if user_id is None or payload.get("type") != "kid":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    return user_id


def _set_auth_cookie(response: JSONResponse, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


# ── Request / response models ───────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    phone: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class KidCreate(BaseModel):
    username: str
    password: str


class KidLogin(BaseModel):
    username: str
    password: str


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("/parent/signup")
def signup_parent(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(
        email=user.email,
        phone=user.phone,
        password_hash=get_password_hash(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Account created", "user_id": new_user.id}


@router.post("/parent/login")
@limiter.limit("10/minute")
def login_parent(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token(data={"sub": db_user.email, "type": "parent", "id": db_user.id})
    response = JSONResponse(content={"user_id": db_user.id, "user_type": "parent"})
    _set_auth_cookie(response, token)
    return response


@router.post("/kid/create")
def create_kid(kid: KidCreate, parent_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    parent = db.query(User).filter(User.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    if db.query(Kid).filter(Kid.username == kid.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    new_kid = Kid(
        parent_id=parent.id,
        username=kid.username,
        password_hash=get_password_hash(kid.password),
        subscription_status=False,
    )
    db.add(new_kid)
    db.commit()
    db.refresh(new_kid)
    return {"message": "Kid created", "kid_id": new_kid.id}


@router.post("/kid/login")
@limiter.limit("10/minute")
def login_kid(request: Request, kid: KidLogin, db: Session = Depends(get_db)):
    db_kid = db.query(Kid).filter(Kid.username == kid.username).first()
    if not db_kid or not verify_password(kid.password, db_kid.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token(data={"sub": db_kid.username, "type": "kid", "id": db_kid.id})
    response = JSONResponse(content={
        "user_id": db_kid.id,
        "user_type": "kid",
        "username": db_kid.username,
    })
    _set_auth_cookie(response, token)
    return response


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/", samesite="lax")
    return {"message": "Logged out"}


@router.get("/me")
def get_me(token: str = Depends(_get_token)):
    """Returns the current user's identity — useful for session recovery on page load."""
    payload = _decode(token)
    return {
        "user_id": payload.get("id"),
        "user_type": payload.get("type"),
        "username": payload.get("sub"),
    }
