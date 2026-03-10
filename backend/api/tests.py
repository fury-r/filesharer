from django.test import TestCase

from .mcp_registry import create_session, reset_registry, upsert_peer


class MCPSessionViewTests(TestCase):
    def setUp(self):
        reset_registry()

    def tearDown(self):
        reset_registry()

    def test_create_session_returns_expected_transport_metadata(self):
        response = self.client.get("/v1/mcp/session/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("session_id", payload)
        self.assertEqual(payload["peer_count"], 0)
        self.assertEqual(payload["peers"], [])
        self.assertEqual(payload["transport"], "webrtc-datachannel")
        self.assertEqual(payload["signaling_transport"], "websocket")

    def test_session_detail_returns_registered_peer_information(self):
        session = create_session()
        upsert_peer(
            session["session_id"],
            "peer-edge-01",
            "Edge Gateway",
            "provider",
            [{"name": "get_device_status"}],
        )

        response = self.client.get(f"/v1/mcp/session/{session['session_id']}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["peer_count"], 1)
        self.assertEqual(payload["peers"][0]["peer_id"], "peer-edge-01")
        self.assertEqual(payload["peers"][0]["role"], "provider")
        self.assertEqual(payload["peers"][0]["tools"][0]["name"], "get_device_status")

    def test_session_detail_returns_404_for_unknown_session(self):
        response = self.client.get("/v1/mcp/session/unknown-session/")

        self.assertEqual(response.status_code, 404)
