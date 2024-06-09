import json
import shutil
from api.models import Upload
from channels.generic.websocket import AsyncWebsocketConsumer
import django
import os
from api import PATH, users
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()
class FileUpload(AsyncWebsocketConsumer):
    session_hash=""
    async def connect(self):
        self.session_hash=self.scope.get("url_route",{}).get("kwargs",{}).get("hash")
        self.channel_layer=get_channel_layer()
        self.uuid=self.scope.get("url_route",{}).get("kwargs",{}).get("uuid")

        if self.session_hash:
            await self.channel_layer.group_add(
                self.session_hash,
                self.channel_name

            )
            await self.accept()
            if self.session_hash not in users:
                users[self.session_hash]={
                    "chats":[],
                    "users":set()
                }
            users[self.session_hash]["users"].add(self.uuid)
        count=len(users[self.session_hash]['users'])
        if count>1:
            # update the connections if there is more than one user
            await self.channel_layer.group_send(self.session_hash,{
                "type":"user_count",
                "count": count
            })   
            await self.channel_layer.group_send(self.session_hash,{
                "type":"send_message",
            })           
    async def disconnect(self, close_code):
        print("disconnecting")
        await self.channel_layer.group_discard(
             self.session_hash,
            self.channel_name
        )
        users[self.session_hash]["users"].remove(self.uuid)
        count=len(users[self.session_hash]["users"])
        #clears session history
        if count==0:
            users.pop(self.session_hash)
            shutil.rmtree(PATH+f"/{self.session_hash}/")
            Upload.objects.filter(hash=self.session_hash).delete()
        await self.channel_layer.group_send(self.session_hash,{
            "type":"user_count",
            "count": count
        })    
        await self.channel_layer.group_send(self.session_hash,{
            "type":"send_message",
        }) 
    # handles only messaging         
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        keys=text_data_json.keys()
        assert "session_hash" in keys
        assert "uuid" in keys
        assert "message" in keys
        msg={
            "uuid":text_data_json['uuid'],
            "message":text_data_json["message"]
        }
        users[text_data_json['session_hash']]['chats'].append(msg)
        await self.channel_layer.group_send(self.session_hash,{
            "type":"send_message",
        })  


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
    async def send_message(self,event):
        chats=users[self.session_hash]['chats']
        print(chats,self.uuid)
        await self.send(text_data=json.dumps({
            'chats':list(map(lambda x:{"user":1 if self.uuid==x['uuid'] else 2 ,"message":x['message']},chats))
        }))    