import secrets
import time


mcp_sessions = {}


def normalize_session_id(session_id):
    return (session_id or "").strip().lower()


def serialize_session(session_id):
    session_key = normalize_session_id(session_id)
    session = mcp_sessions.get(session_key)
    if not session:
        return None

    peers = list(session["peers"].values())
    peers.sort(key=lambda peer: (peer.get("role", ""), peer.get("name", ""), peer.get("peer_id", "")))
    return {
        "session_id": session_key,
        "created_at": session["created_at"],
        "peer_count": len(peers),
        "peers": peers,
    }


def create_session():
    session_id = secrets.token_hex(4)
    mcp_sessions[session_id] = {
        "created_at": int(time.time()),
        "peers": {},
    }
    return serialize_session(session_id)


def ensure_session(session_id):
    session_key = normalize_session_id(session_id)
    if session_key not in mcp_sessions:
        mcp_sessions[session_key] = {
            "created_at": int(time.time()),
            "peers": {},
        }
    return mcp_sessions[session_key]


def upsert_peer(session_id, peer_id, name, role, tools=None):
    session = ensure_session(session_id)
    session["peers"][peer_id] = {
        "peer_id": peer_id,
        "name": name,
        "role": role,
        "tools": tools or [],
        "updated_at": int(time.time()),
    }
    return serialize_session(session_id)


def remove_peer(session_id, peer_id):
    session_key = normalize_session_id(session_id)
    session = mcp_sessions.get(session_key)
    if not session:
        return None

    session["peers"].pop(peer_id, None)
    if not session["peers"]:
        removed_session = serialize_session(session_key)
        mcp_sessions.pop(session_key, None)
        return removed_session
    return serialize_session(session_key)


def reset_registry():
    mcp_sessions.clear()
