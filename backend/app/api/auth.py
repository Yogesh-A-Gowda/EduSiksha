from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..db.base import get_db
from ..db.models import User, Kid
from ..core.security import get_password_hash, verify_password, create_access_token, ALGORITHM, SECRET_KEY
from pydantic import BaseModel
from typing import Optional
from jose import JWTError, jwt

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/parent/login")

def get_current_user_id(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("id")
        user_type: str = payload.get("type")
        if user_id is None or user_type != "parent":
             raise credentials_exception
        return user_id
        return user_id
    except JWTError:
        raise credentials_exception

def get_current_kid_id(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("id")
        user_type: str = payload.get("type")
        if user_id is None or user_type != "kid":
             # Optional: Allow parents to view kid data? For now strict role check
             raise credentials_exception
        return user_id
    except JWTError:
        raise credentials_exception

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

@router.post("/parent/signup")
def signup_parent(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, phone=user.phone, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "user_id": new_user.id}

@router.post("/parent/login")
def login_parent(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": db_user.email, "type": "parent", "id": db_user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/kid/create")
def create_kid(kid: KidCreate, parent_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # Verify parent exists
    parent = db.query(User).filter(User.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # Check username uniqueness across all kids? or just this parent's?
    # Usually global username for login ease
    existing_kid = db.query(Kid).filter(Kid.username == kid.username).first()
    if existing_kid:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = get_password_hash(kid.password)
    new_kid = Kid(
        parent_id=parent.id,
        username=kid.username,
        password_hash=hashed_password,
        subscription_status=False # Defaults to False until paid
    )
    db.add(new_kid)
    db.commit()
    db.refresh(new_kid)
    return {"message": "Kid created successfully", "kid_id": new_kid.id}

@router.post("/kid/login")
def login_kid(kid: KidLogin, db: Session = Depends(get_db)):
    db_kid = db.query(Kid).filter(Kid.username == kid.username).first()
    if not db_kid or not verify_password(kid.password, db_kid.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    if not db_kid.is_active_access:
        # Check subscription status logic here or return info
         pass 

    access_token = create_access_token(data={"sub": db_kid.username, "type": "kid", "id": db_kid.id})
    return {"access_token": access_token, "token_type": "bearer"}
