import json
from channels.generic.websocket import AsyncWebsocketConsumer
import django
import os
from api import users
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()
class FileUpload(AsyncWebsocketConsumer):
    session_hash=""
    async def connect(self):
        self.session_hash=self.scope.get("url_route",{}).get("kwargs",{}).get("hash")
        print("connecting",self.session_hash)
        self.channel_layer=get_channel_layer()

        if self.session_hash:
            await self.channel_layer.group_add(
                self.session_hash,
                self.channel_name

            )
            await self.accept()
            if self.session_hash not in users:
                users[self.session_hash]=0
            users[self.session_hash]+=1
        await self.channel_layer.group_send(self.session_hash,{
            "type":"user_count",
            "count": users[self.session_hash]
        })            
    async def disconnect(self, close_code):
        print("disconnecting")
        await self.channel_layer.group_discard(
             self.session_hash,
            self.channel_name
        )
        users[self.session_hash]-=1
        await self.channel_layer.group_send(self.session_hash,{
            "type":"user_count",
            "count": users[self.session_hash]
        })            
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
    async def send_file_update(self, event):
        message = event['files']
        print(event,"socket")
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'files': message
        }))
    async def user_count(self,event):
        message = event['count']
        print(event,"count")
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'count': message
        }))        