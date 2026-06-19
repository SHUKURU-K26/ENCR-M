"""routers/auth.py"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid, random, time

import db
from auth_utils import hash_password, verify_password, create_token
from constants import ORG_ROLES

router = APIRouter()

class LoginRequest(BaseModel):
    identifier: str
    password: str

class SignupRequest(BaseModel):
    otp: str
    username: str
    full_name: str
    phone: str
    password: str
    org_role: str
    org_role_detail: Optional[str] = None
    avatar_color: Optional[str] = "#6366f1"

class VerifyOTPRequest(BaseModel):
    otp: str

class PasswordCheckRequest(BaseModel):
    user_id: str
    password: str

def _bootstrap_admin():
    users = db.load("users")
    users = [u for u in users if u.get("role") != "admin"]
    users.append({
        "id": str(uuid.uuid4()), "username": "access", "full_name": "System Administrator",
        "phone": "0781234567", "password": hash_password("chatAccess1234"),
        "role": "admin", "avatar_color": "#ef4444", "created_at": time.time(), "is_active": True,
    })
    db.save("users", users)

_bootstrap_admin()

@router.post("/verify-otp")
def verify_otp(body: VerifyOTPRequest):
    otps = db.load("otps")
    now  = time.time()
    match = next((o for o in otps if o["code"] == body.otp and not o["used"]), None)
    if not match:
        raise HTTPException(400, "Invalid OTP code")
    if now > match["expires_at"]:
        raise HTTPException(400, "OTP has expired")
    # Tell the frontend which role this code is bound to, so the signup
    # form can pre-select / lock the dropdown before the user fills anything in
    return {"valid": True, "role": match.get("role"), "role_detail": match.get("role_detail")}


@router.post("/signup")
def signup(body: SignupRequest):
    otps = db.load("otps")
    now  = time.time()
    match = next(
        (o for o in otps if o["code"] == body.otp and not o["used"] and now <= o["expires_at"]),
        None
    )
    if not match:
        raise HTTPException(400, "OTP invalid or expired — request a new one")

    if body.org_role not in ORG_ROLES:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(ORG_ROLES)}")
    if body.org_role == "Other" and not (body.org_role_detail and body.org_role_detail.strip()):
        raise HTTPException(400, "Please describe your role")

    # Legacy OTPs created before this feature have no "role" key — treat those as
    # unrestricted instead of blocking them. New OTPs always carry a bound role.
    bound_role = match.get("role")
    if bound_role is not None and bound_role != body.org_role:
        raise HTTPException(
            400,
            f"This invite code was issued for a {bound_role} account — "
            f"please select that role, or contact your administrator."
        )

    if db.find_one("users", username=body.username):
        raise HTTPException(409, "Username already taken")
    if db.find_one("users", phone=body.phone):
        raise HTTPException(409, "Phone number already registered")

    user_id = str(uuid.uuid4())
    db.insert("users", {
        "id": user_id, "username": body.username, "full_name": body.full_name,
        "phone": body.phone, "password": hash_password(body.password), "role": "member",
        "org_role": body.org_role,
        "org_role_detail": body.org_role_detail.strip() if body.org_role == "Other" else None,
        "avatar_color": body.avatar_color, "created_at": now, "is_active": True,
    })

    db.update_one("otps", {"code": body.otp}, {"used": True})

    token = create_token(user_id, body.username, "member")
    return {
        "token": token, "user_id": user_id, "username": body.username, "role": "member",
        "full_name": body.full_name, "avatar_color": body.avatar_color, "org_role": body.org_role,
    }


@router.post("/login")
def login(body: LoginRequest):
    users = db.load("users")
    user  = next((u for u in users if u.get("username") == body.identifier or u.get("phone") == body.identifier), None)
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account disabled")
    token = create_token(user["id"], user["username"], user["role"])
    return {
        "token": token, "user_id": user["id"], "username": user["username"],
        "full_name": user["full_name"], "role": user["role"],
        "avatar_color": user.get("avatar_color", "#6366f1"),
    }


@router.post("/verify-password")
def verify_pwd(body: PasswordCheckRequest):
    user = db.find_one("users", id=body.user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Incorrect password")
    return {"valid": True}