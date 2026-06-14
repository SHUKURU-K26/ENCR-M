"""auth_utils.py — JWT tokens + bcrypt password hashing"""
import os, jwt, bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Header
from typing import Optional

SECRET_KEY = os.getenv("ENCR_SECRET", "encr-m-super-secret-2024-change-in-prod")
ALGORITHM  = "HS256"
TOKEN_TTL  = 60 * 20   # 20 minutes → auto-logout

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub":      user_id,
        "username": username,
        "role":     role,
        "exp":      datetime.now(timezone.utc) + timedelta(seconds=TOKEN_TTL),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired — please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or malformed Authorization header")
    return decode_token(authorization.split(" ", 1)[1])

def require_admin(user=None):
    """Dependency — raises 403 if caller is not admin."""
    from fastapi import Depends
    def _check(current=Depends(get_current_user)):
        if current.get("role") != "admin":
            raise HTTPException(403, "Admin access required")
        return current
    return _check