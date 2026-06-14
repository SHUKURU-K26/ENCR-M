from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json, os, asyncio
from routers import auth, messages, users, admin, media

app = FastAPI(title="ENCR-M Secure Messaging", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Mount media uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(users.router,    prefix="/api/users",    tags=["Users"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(admin.router,    prefix="/api/admin",    tags=["Admin"])
app.include_router(media.router,    prefix="/api/media",    tags=["Media"])

# ── WebSocket connection manager ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}   # user_id → socket

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_to(self, user_id: str, data: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, data: dict, exclude: str = None):
        for uid, ws in list(self.active.items()):
            if uid != exclude:
                try:
                    await ws.send_json(data)
                except Exception:
                    self.disconnect(uid)

manager = ConnectionManager()

# expose manager to routers
app.state.manager = manager

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    # Notify others that this user is online
    await manager.broadcast({"type": "presence", "user_id": user_id, "status": "online"}, exclude=user_id)
    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("type")

            # ── typing indicator ──────────────────────────────────────────
            if event == "typing":
                await manager.send_to(data["to"], {
                    "type": "typing",
                    "from": user_id,
                    "is_typing": data.get("is_typing", False),
                })

            # ── new message ───────────────────────────────────────────────
            elif event == "message":
                await manager.send_to(data["to"], {
                    "type": "message",
                    "payload": data["payload"],
                })

            # ── message edited ────────────────────────────────────────────
            elif event == "edit":
                await manager.send_to(data["to"], {
                    "type": "edit",
                    "payload": data["payload"],
                })

            # ── message deleted ───────────────────────────────────────────
            elif event == "delete":
                await manager.send_to(data["to"], {
                    "type": "delete",
                    "message_id": data["message_id"],
                    "conversation_id": data["conversation_id"],
                })

            # ── read receipt ──────────────────────────────────────────────
            elif event == "read":
                await manager.send_to(data["to"], {
                    "type": "read",
                    "conversation_id": data["conversation_id"],
                    "reader": user_id,
                })

    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await manager.broadcast({"type": "presence", "user_id": user_id, "status": "offline"}, exclude=user_id)

@app.get("/")
def root():
    return {"status": "ENCR-M backend running"}