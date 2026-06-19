"""routers/users.py"""
from fastapi import APIRouter, Depends
from auth_utils import get_current_user
import db

router = APIRouter()

@router.get("/")
def get_users(current=Depends(get_current_user)):
    users = db.load("users")
    return [
        {
            "id":              u["id"],
            "username":        u["username"],
            "full_name":       u["full_name"],
            "avatar_color":    u.get("avatar_color", "#6366f1"),
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