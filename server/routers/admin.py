"""routers/admin.py"""
from fastapi import APIRouter, Depends, HTTPException
import uuid, random, string, time

import db
from auth_utils import get_current_user

router = APIRouter()

OTP_TTL = 300  # 5 minutes

def _admin_only(current=Depends(get_current_user)):
    if current.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return current

@router.post("/generate-otp")
def generate_otp(current=Depends(_admin_only)):
    """Admin generates a 6-digit OTP for a new member."""
    code = "".join(random.choices(string.digits, k=6))
    now  = time.time()

    # Purge expired unused OTPs to keep the file clean
    otps = [o for o in db.load("otps") if o["expires_at"] > now or o["used"]]

    otp_record = {
        "id":         str(uuid.uuid4()),
        "code":       code,
        "created_by": current["sub"],
        "created_at": now,
        "expires_at": now + OTP_TTL,
        "used":       False,
    }
    otps.append(otp_record)
    db.save("otps", otps)

    return {
        "otp":        code,
        "expires_in": OTP_TTL,
        "expires_at": now + OTP_TTL,
    }

@router.get("/otps")
def list_otps(current=Depends(_admin_only)):
    """Admin sees all OTPs and their status."""
    now  = time.time()
    otps = db.load("otps")
    return [
        {**o, "expired": now > o["expires_at"]}
        for o in otps
    ]

@router.get("/users")
def list_users(current=Depends(_admin_only)):
    users = db.load("users")
    return [
        {k: v for k, v in u.items() if k != "password"}
        for u in users
    ]

@router.patch("/users/{user_id}/toggle")
def toggle_user(user_id: str, current=Depends(_admin_only)):
    user = db.find_one("users", id=user_id)
    if not user:
        raise HTTPException(404, "User not found")
    db.update_one("users", {"id": user_id}, {"is_active": not user.get("is_active", True)})
    return {"success": True}