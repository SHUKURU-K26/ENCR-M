"""routers/messages.py
Messages are stored EXACTLY as the client sends them — already AES-256 encrypted.
The server is a blind relay: it stores ciphertext and routes it.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid, time

import db
from auth_utils import get_current_user

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class MessageIn(BaseModel):
    conversation_id: str
    to:              str          # recipient user_id
    encrypted_body:  str          # AES-256 ciphertext (base64)
    iv:              str          # AES initialisation vector (base64)
    type:            str = "text" # text | image | file | voice | video
    file_url:        Optional[str] = None
    file_name:       Optional[str] = None
    reply_to:        Optional[str] = None  # message_id

class EditMessageIn(BaseModel):
    encrypted_body: str
    iv:             str

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/{conversation_id}")
def get_messages(conversation_id: str, current=Depends(get_current_user)):
    messages = db.load("messages")
    # Only return messages that belong to this conversation
    conv_msgs = [m for m in messages if m["conversation_id"] == conversation_id]
    # Security: caller must be a participant
    uid = current["sub"]
    if conv_msgs:
        first = conv_msgs[0]
        participants = {first["from"], first["to"]}
        if uid not in participants:
            raise HTTPException(403, "Access denied")
    return conv_msgs


@router.post("/")
def send_message(body: MessageIn, current=Depends(get_current_user)):
    msg = {
        "id":              str(uuid.uuid4()),
        "conversation_id": body.conversation_id,
        "from":            current["sub"],
        "to":              body.to,
        "encrypted_body":  body.encrypted_body,   # ← ciphertext only!
        "iv":              body.iv,
        "type":            body.type,
        "file_url":        body.file_url,
        "file_name":       body.file_name,
        "reply_to":        body.reply_to,
        "timestamp":       time.time(),
        "edited":          False,
        "deleted":         False,
        "read":            False,
    }
    db.insert("messages", msg)
    return msg


@router.patch("/{message_id}")
def edit_message(message_id: str, body: EditMessageIn, current=Depends(get_current_user)):
    messages = db.load("messages")
    msg = next((m for m in messages if m["id"] == message_id), None)
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg["from"] != current["sub"]:
        raise HTTPException(403, "Cannot edit someone else's message")
    db.update_one("messages", {"id": message_id}, {
        "encrypted_body": body.encrypted_body,
        "iv":             body.iv,
        "edited":         True,
    })
    return {"success": True}


@router.delete("/{message_id}")
def delete_message(message_id: str, current=Depends(get_current_user)):
    messages = db.load("messages")
    msg = next((m for m in messages if m["id"] == message_id), None)
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg["from"] != current["sub"]:
        raise HTTPException(403, "Cannot delete someone else's message")
    db.update_one("messages", {"id": message_id}, {
        "deleted":        True,
        "encrypted_body": "",
        "iv":             "",
    })
    return {"success": True}


@router.patch("/{conversation_id}/read")
def mark_read(conversation_id: str, current=Depends(get_current_user)):
    messages = db.load("messages")
    updated = False
    for m in messages:
        if m["conversation_id"] == conversation_id and m["to"] == current["sub"] and not m["read"]:
            m["read"] = True
            updated = True
    if updated:
        db.save("messages", messages)
    return {"success": True}