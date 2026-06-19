"""routers/admin.py"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid, random, string, time

import db
from auth_utils import get_current_user
from constants import ORG_ROLES

router = APIRouter()

OTP_TTL = 300  # 5 minutes

def _admin_only(current=Depends(get_current_user)):
    if current.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return current

class GenerateOTPRequest(BaseModel):
    role: str
    role_detail: Optional[str] = None  # required only when role == "Other"

@router.post("/generate-otp")
def generate_otp(body: GenerateOTPRequest, current=Depends(_admin_only)):
    """Admin generates a 6-digit OTP bound to a specific institutional role."""
    if body.role not in ORG_ROLES:
        raise HTTPException(400, f"Invalid role. Must be one of: {', '.join(ORG_ROLES)}")
    if body.role == "Other" and not (body.role_detail and body.role_detail.strip()):
        raise HTTPException(400, "Please describe the custom role for 'Other'")

    code = "".join(random.choices(string.digits, k=6))
    now  = time.time()

    otps = [o for o in db.load("otps") if o["expires_at"] > now or o["used"]]

    otp_record = {
        "id":          str(uuid.uuid4()),
        "code":        code,
        "role":        body.role,
        "role_detail": body.role_detail.strip() if body.role == "Other" else None,
        "created_by":  current["sub"],
        "created_at":  now,
        "expires_at":  now + OTP_TTL,
        "used":        False,
    }
    otps.append(otp_record)
    db.save("otps", otps)

    return {
        "otp":         code,
        "role":        body.role,
        "role_detail": otp_record["role_detail"],
        "expires_in":  OTP_TTL,
        "expires_at":  now + OTP_TTL,
    }

@router.get("/otps")
def list_otps(current=Depends(_admin_only)):
    now  = time.time()
    otps = db.load("otps")
    return [{**o, "expired": now > o["expires_at"]} for o in otps]

@router.get("/users")
def list_users(current=Depends(_admin_only)):
    users = db.load("users")
    return [{k: v for k, v in u.items() if k != "password"} for u in users]

@router.get("/users/grouped")
def list_users_grouped(current=Depends(_admin_only)):
    """Members tab: users bucketed by institutional role for sectioned display."""
    users   = db.load("users")
    grouped = {role: [] for role in ORG_ROLES if role != "Other"}
    grouped["Other"]      = []
    grouped["Unassigned"] = []

    for u in users:
        if u.get("role") == "admin":
            continue  # the admin isn't part of the org chart
        clean = {k: v for k, v in u.items() if k != "password"}
        org_role = u.get("org_role")
        grouped[org_role].append(clean) if org_role in grouped else grouped["Unassigned"].append(clean)

    return grouped

@router.patch("/users/{user_id}/toggle")
def toggle_user(user_id: str, current=Depends(_admin_only)):
    user = db.find_one("users", id=user_id)
    if not user:
        raise HTTPException(404, "User not found")
    db.update_one("users", {"id": user_id}, {"is_active": not user.get("is_active", True)})
    return {"success": True}