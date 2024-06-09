from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path,re_path
from api.file_socket import FileUpload

websocket_urlpatterns = [
    path('ws/file/<str:hash>/<str:uuid>', FileUpload.as_asgi()),
]
