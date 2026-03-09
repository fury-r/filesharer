import secrets
import time
from threading import Lock


mcp_sessions = {}
registry_lock = Lock()
SESSION_TTL_SECONDS = 60 * 60


def normalize_session_id(session_id):
    return (session_id or "").strip().lower()


def prune_expired_sessions():
    now = int(time.time())
    expired_sessions = [
        session_id for session_id, session in mcp_sessions.items() if now - session.get("updated_at", session["created_at"]) > SESSION_TTL_SECONDS
    ]
    for session_id in expired_sessions:
        mcp_sessions.pop(session_id, None)


def serialize_session(session_id):
    session_key = normalize_session_id(session_id)
    with registry_lock:
        prune_expired_sessions()
        session = mcp_sessions.get(session_key)
        if not session:
            return None

        peers = list(session["peers"].values())
    peers.sort(key=lambda peer: (peer["role"], peer["name"], peer["peer_id"]))
    return {
        "session_id": session_key,
        "created_at": session["created_at"],
        "peer_count": len(peers),
        "peers": peers,
    }


def create_session():
    session_id = secrets.token_hex(4)
    with registry_lock:
        prune_expired_sessions()
        mcp_sessions[session_id] = {
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
            "peers": {},
        }
    return serialize_session(session_id)


def ensure_session(session_id):
    session_key = normalize_session_id(session_id)
    with registry_lock:
        prune_expired_sessions()
        if session_key not in mcp_sessions:
            mcp_sessions[session_key] = {
                "created_at": int(time.time()),
                "updated_at": int(time.time()),
                "peers": {},
            }
        else:
            mcp_sessions[session_key]["updated_at"] = int(time.time())
        return mcp_sessions[session_key]


def upsert_peer(session_id, peer_id, name, role, tools=None):
    session = ensure_session(session_id)
    with registry_lock:
        session["peers"][peer_id] = {
            "peer_id": peer_id,
            "name": name,
            "role": role,
            "tools": tools or [],
            "updated_at": int(time.time()),
        }
        session["updated_at"] = int(time.time())
    return serialize_session(session_id)


def remove_peer(session_id, peer_id):
    session_key = normalize_session_id(session_id)
    with registry_lock:
        prune_expired_sessions()
        session = mcp_sessions.get(session_key)
        if not session:
            return None

        session["peers"].pop(peer_id, None)
        if not session["peers"]:
            final_session_snapshot = {
                "session_id": session_key,
                "created_at": session["created_at"],
                "peer_count": 0,
                "peers": [],
            }
            mcp_sessions.pop(session_key, None)
            return final_session_snapshot
        session["updated_at"] = int(time.time())
    return serialize_session(session_key)


def reset_registry():
    with registry_lock:
        mcp_sessions.clear()
