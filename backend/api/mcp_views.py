from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .mcp_registry import create_session, serialize_session


class MCPSessionCreateView(APIView):
    def get(self, request, *args, **kwargs):
        session = create_session()
        return Response(
            {
                **session,
                "transport": "webrtc-datachannel",
                "signaling_transport": "websocket",
            },
            status=status.HTTP_200_OK,
        )


class MCPSessionDetailView(APIView):
    def get(self, request, session_id, *args, **kwargs):
        session = serialize_session(session_id)
        if not session:
            return Response({"message": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            {
                **session,
                "transport": "webrtc-datachannel",
                "signaling_transport": "websocket",
            },
            status=status.HTTP_200_OK,
        )
