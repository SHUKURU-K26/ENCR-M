"""routers/auth.py"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid, random, time

import db
from auth_utils import hash_password, verify_password, create_token

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    identifier: str          # phone OR username
    password: str

class SignupRequest(BaseModel):
    otp: str
    username: str
    full_name: str
    phone: str
    password: str
    avatar_color: Optional[str] = "#6366f1"

class VerifyOTPRequest(BaseModel):
    otp: str

class PasswordCheckRequest(BaseModel):
    user_id: str
    password: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def _bootstrap_admin():
    """Create default admin if none exists."""
    if not db.find_one("users", role="admin"):
        db.insert("users", {
            "id":         str(uuid.uuid4()),
            "username":   "access",
            "full_name":  "System Administrator",
            "phone":      "0781234567",
            "password":   hash_password("chatAccess1234"),
            "role":       "admin",
            "avatar_color": "#ef4444",
            "created_at": time.time(),
            "is_active":  True,
        })

_bootstrap_admin()

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/verify-otp")
def verify_otp(body: VerifyOTPRequest):
    """Step-1 of sign-up: validate OTP before showing the form."""
    otps = db.load("otps")
    now  = time.time()
    match = next((o for o in otps if o["code"] == body.otp and not o["used"]), None)
    if not match:
        raise HTTPException(400, "Invalid OTP code")
    if now > match["expires_at"]:
        raise HTTPException(400, "OTP has expired")
    return {"valid": True}


@router.post("/signup")
def signup(body: SignupRequest):
    # Re-validate OTP
    otps = db.load("otps")
    now  = time.time()
    match = next(
        (o for o in otps if o["code"] == body.otp and not o["used"] and now <= o["expires_at"]),
        None
    )
    if not match:
        raise HTTPException(400, "OTP invalid or expired — request a new one")

    # Check uniqueness
    if db.find_one("users", username=body.username):
        raise HTTPException(409, "Username already taken")
    if db.find_one("users", phone=body.phone):
        raise HTTPException(409, "Phone number already registered")

    user_id = str(uuid.uuid4())
    db.insert("users", {
        "id":           user_id,
        "username":     body.username,
        "full_name":    body.full_name,
        "phone":        body.phone,
        "password":     hash_password(body.password),
        "role":         "member",
        "avatar_color": body.avatar_color,
        "created_at":   now,
        "is_active":    True,
    })

    # Mark OTP as used
    db.update_one("otps", {"code": body.otp}, {"used": True})

    token = create_token(user_id, body.username, "member")
    return {"token": token, "user_id": user_id, "username": body.username, "role": "member", "full_name": body.full_name, "avatar_color": body.avatar_color}


@router.post("/login")
def login(body: LoginRequest):
    users = db.load("users")
    user  = next(
        (u for u in users if u.get("username") == body.identifier or u.get("phone") == body.identifier),
        None
    )
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account disabled")

    token = create_token(user["id"], user["username"], user["role"])
    return {
        "token":        token,
        "user_id":      user["id"],
        "username":     user["username"],
        "full_name":    user["full_name"],
        "role":         user["role"],
        "avatar_color": user.get("avatar_color", "#6366f1"),
    }


@router.post("/verify-password")
def verify_pwd(body: PasswordCheckRequest):
    """2nd-layer security: re-verify password before opening a chat."""
    user = db.find_one("users", id=body.user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Incorrect password")
    return {"valid": True}