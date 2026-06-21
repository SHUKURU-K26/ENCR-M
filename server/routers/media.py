"""routers/media.py — file / image / voice / video uploads"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from auth_utils import get_current_user
import uuid, os, time, mimetypes

router = APIRouter()

UPLOAD_DIR = "uploads"
MAX_SIZE   = 50 * 1024 * 1024  # 50 MB

# Render sets RENDER_EXTERNAL_URL automatically on every web service — no
# manual config needed there. Falls back to localhost for local dev. If you
# ever host the backend somewhere else, just set PUBLIC_BASE_URL yourself.
PUBLIC_BASE_URL = (
    os.getenv("RENDER_EXTERNAL_URL")
    or os.getenv("PUBLIC_BASE_URL")
    or "http://localhost:8000"
).rstrip("/")

ALLOWED_TYPES = {
    "image":  {"image/jpeg", "image/png", "image/gif", "image/webp"},
    "video":  {"video/mp4", "video/webm", "video/ogg"},
    "voice":  {"audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/mp4"},
    "file":   None,   # any
}

def _get_media_type(mime: str) -> str:
    for mtype, mimes in ALLOWED_TYPES.items():
        if mimes and mime in mimes:
            return mtype
    return "file"

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current=Depends(get_current_user)):
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "File too large (max 50 MB)")

    ext      = os.path.splitext(file.filename or "")[1] or ".bin"
    filename = f"{uuid.uuid4()}{ext}"
    path     = os.path.join(UPLOAD_DIR, filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(path, "wb") as f:
        f.write(content)

    mime      = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    media_type = _get_media_type(mime)

    return {
        "url":        f"{PUBLIC_BASE_URL}/uploads/{filename}",
        "filename":   file.filename,
        "media_type": media_type,
        "mime":       mime,
        "size":       len(content),
    }