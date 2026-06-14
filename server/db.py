"""
db.py — JSON-file "database" helper
All data lives in  backend/data/*.json
"""
import json, os, threading
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

_locks: dict[str, threading.Lock] = {}

def _lock(name: str) -> threading.Lock:
    if name not in _locks:
        _locks[name] = threading.Lock()
    return _locks[name]

def _path(name: str) -> Path:
    return DATA_DIR / f"{name}.json"

def load(name: str) -> list | dict:
    p = _path(name)
    if not p.exists():
        return [] if name in ("users", "messages", "otps", "media") else {}
    with _lock(name), open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def save(name: str, data: list | dict) -> None:
    p = _path(name)
    with _lock(name), open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def find_one(name: str, **kwargs):
    """Return first record matching all kwargs."""
    for rec in load(name):
        if all(rec.get(k) == v for k, v in kwargs.items()):
            return rec
    return None

def insert(name: str, record: dict) -> dict:
    data = load(name)
    data.append(record)
    save(name, data)
    return record

def update_one(name: str, match: dict, patch: dict) -> bool:
    data = load(name)
    for rec in data:
        if all(rec.get(k) == v for k, v in match.items()):
            rec.update(patch)
            save(name, data)
            return True
    return False

def delete_one(name: str, **kwargs) -> bool:
    data = load(name)
    new = [r for r in data if not all(r.get(k) == v for k, v in kwargs.items())]
    if len(new) == len(data):
        return False
    save(name, new)
    return True