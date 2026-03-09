from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path,re_path
from api.file_socket import FileUpload
from api.mcp_socket import MCPSignalingConsumer

websocket_urlpatterns = [
    path('ws/file/<str:hash>/<str:uuid>', FileUpload.as_asgi()),
    path('ws/mcp/<str:session_id>/<str:peer_id>', MCPSignalingConsumer.as_asgi()),
]
