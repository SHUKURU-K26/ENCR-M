"""routers/users.py"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth_utils import get_current_user
import db

router = APIRouter()

class AvatarUpdate(BaseModel):
    url: str

@router.get("/")
def get_users(current=Depends(get_current_user)):
    users = db.load("users")
    return [
        {
            "id":              u["id"],
            "username":        u["username"],
            "full_name":       u["full_name"],
            "avatar_color":    u.get("avatar_color", "#6366f1"),
            "avatar_url":      u.get("avatar_url"),
            "role":            u["role"],
            "org_role":        u.get("org_role"),
            "org_role_detail": u.get("org_role_detail"),
            "is_active":       u.get("is_active", True),
        }
        for u in users
        if u["id"] != current["sub"]
    ]

@router.get("/me")
def get_me(current=Depends(get_current_user)):
    user = db.find_one("users", id=current["sub"])
    if not user:
        return {}
    return {k: v for k, v in user.items() if k != "password"}

@router.patch("/me/avatar")
def update_my_avatar(body: AvatarUpdate, current=Depends(get_current_user)):
    """Attaches an already-uploaded photo URL to the logged-in account."""
    user = db.find_one("users", id=current["sub"])
    if not user:
        raise HTTPException(404, "User not found")
    db.update_one("users", {"id": current["sub"]}, {"avatar_url": body.url})
    return {"success": True, "avatar_url": body.url}