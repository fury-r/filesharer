import json

from channels.generic.websocket import AsyncWebsocketConsumer

from .mcp_registry import ensure_session, remove_peer, serialize_session, upsert_peer


class MCPSignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope.get("url_route", {}).get("kwargs", {}).get("session_id", "")
        self.peer_id = self.scope.get("url_route", {}).get("kwargs", {}).get("peer_id", "")
        self.group_name = f"mcp_{self.session_id}"
        ensure_session(self.session_id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_snapshot()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        snapshot = remove_peer(self.session_id, self.peer_id)
        if snapshot:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "peer_snapshot_event",
                    "snapshot": snapshot,
                },
            )

    async def receive(self, text_data):
        payload = json.loads(text_data)
        payload_type = payload.get("type")

        if payload_type == "peer_announce":
            snapshot = upsert_peer(
                self.session_id,
                self.peer_id,
                payload.get("name", "Anonymous peer"),
                payload.get("role", "observer"),
                payload.get("tools", []),
            )
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "peer_snapshot_event",
                    "snapshot": snapshot,
                },
            )
            return

        if payload_type == "signal":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "relay_signal",
                    "payload": {
                        "type": "signal",
                        "session_id": self.session_id,
                        "from_peer_id": self.peer_id,
                        "target_peer_id": payload.get("target_peer_id"),
                        "signal_type": payload.get("signal_type"),
                        "payload": payload.get("payload"),
                    },
                },
            )

    async def relay_signal(self, event):
        target_peer_id = event["payload"].get("target_peer_id")
        if target_peer_id == self.peer_id:
            await self.send(text_data=json.dumps(event["payload"]))

    async def peer_snapshot_event(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "peer_snapshot",
                    **event["snapshot"],
                }
            )
        )

    async def send_snapshot(self):
        snapshot = serialize_session(self.session_id)
        await self.send(
            text_data=json.dumps(
                {
                    "type": "peer_snapshot",
                    **(snapshot or {"session_id": self.session_id, "peer_count": 0, "peers": []}),
                }
            )
        )
