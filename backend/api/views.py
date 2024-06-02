import base64
from io import BytesIO
from django.shortcuts import render
from .utils import generate_qr_code, verify_qr_code
from rest_framework import generics,status
from rest_framework.response import Response
from .models import BlogPost,Upload, File
from .serializers import BlogPostSerializer, FilesSerialzer, UploadSerializer
import shutil
import hashlib 
from datetime import datetime
import calendar
from rest_framework.views import APIView
import os
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadhandler import FileUploadHandler
from PIL import Image
import zipfile
from django.http import HttpResponse
# Create your views here.
PATH=os.getcwd()+"/store"
class BlogPostListCreate(generics.ListCreateAPIView):
    queryset=BlogPost.objects.all()
    serializer_class=BlogPostSerializer

    def delete(self,request,*args,**kwargs):
        BlogPost.objects.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class BlogPostListRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset=BlogPost.objects.all()
    serializer_class=BlogPostSerializer
    lookup_fields="pk"

class BlogPostList(APIView):
    def get(self,request,format=None):
        title=request.query_params.get("title","")
        if title:
            blogpost=BlogPost.objects.filter(title_icontains=title)
        else:
            blogpost=BlogPost.objects.all()

        serializer=BlogPostSerializer(blogpost,many=True)
        return Response(serializer.data,status=status.HTTP_200_OK)
    

#used to monitor progress
class FileUploadProgressHandler(FileUploadHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.progress = 0

    def handle_raw_input(self, input_data, META, content_length, boundary, encoding=None):
        self.content_length = content_length

    def receive_data_chunk(self, raw_data, start):
        self.progress += len(raw_data)
    
    def file_complete(self, file_size):
        return None

class FileUploadView(APIView):  
    parser_classes = [FileUploadProgressHandler]

    def post(self, request, *args, **kwargs):
        print(request)
        if not os.path.exists(PATH):
            os.mkdir("store")
        files = request.FILES
        print(request.FILES)
        total_files=len(files)
        hash_s=hashlib.sha256(str(calendar.timegm(datetime.now().timetuple())+total_files).encode()).hexdigest()
        upload_data=Upload.objects.create(hash=hash_s,total_files=total_files)
        os.mkdir(PATH+f"/{hash_s}")
        for  filename,file in files.items():
            print(file)
            fs = FileSystemStorage(location=PATH+f"/{hash_s}/")
            fs.save(filename, file)
            File.objects.create(name=filename,upload=upload_data,size=file.size,content_type=file.content_type)
            print(file.name)
        
        qr=generate_qr_code(hash_s)
            

        return Response({
            "qr":qr,
            "hash":hash_s
        },status=status.HTTP_200_OK)


class QRValidationView(APIView):
    def post(self,request,*args,**kwargs):
        qr=request.FILES.get("qr")
        qr=Image.open(qr)
        buffered=BytesIO()
        qr.save(buffered,format="PNG")
        buffered.seek(0)        
        qr_hash=verify_qr_code(qr)
        print(qr_hash)
        if not qr_hash: 
            return Response({
                "message":"Invalid QR"
        },status=status.HTTP_404_NOT_FOUND)                  
        try:
            upload_item=Upload.objects.get(hash=qr_hash)
            if not upload_item:
                return Response({
                    "message":"Not found or Invalid QR"
            },status=status.HTTP_404_NOT_FOUND) 
            files= FilesSerialzer(File.objects.select_related('upload').filter(upload=upload_item.id),many=True).data
            
            if len(files)==0:
                return Response({
                    "message":"Not found or Invalid QR"
            },status=status.HTTP_404_NOT_FOUND)                 
            return   Response({
            "files":files,
            "upload_details":UploadSerializer(upload_item).data
            },status=status.HTTP_200_OK) 
        except Exception as e:
            print(e)
            return Response({
                    "message":"Not found or Invalid QR"
            },status=status.HTTP_404_NOT_FOUND) 
        

def download_file(request,hash_id,file_id=None):
    if file_id:
        split_files=file_id.split(',')
        files=FilesSerialzer(File.objects.select_related("upload").filter(id__in=split_files),many=True).data
    else:
        files=FilesSerialzer(File.objects.select_related("upload").filter(upload_id__hash=hash_id),many=True).data
    print(files)
    final_file=None
    filename=None
    content_type="application/force-download"
    if len(files)==1:
        if files[0].get('upload ',{}).get("hash")!=hash_id:
            return Response({},status=status.HTTP_404_NOT_FOUND)
        filename=files[0].get('name')
        file_path=PATH+f"/{hash_id}/{filename}"

        with open(file_path,"rb") as f:
            final_file=f.read()
    else:
        filename=f"{hash_id}.zip"
        final_file = BytesIO()

        with zipfile.ZipFile(final_file,"w", compression=zipfile.ZIP_DEFLATED) as zip_file:

            for file in files:
                print(file)
                if file.get('upload',{}).get("hash")!=hash_id:
                    return Response({},status=status.HTTP_404_NOT_FOUND)
                file_path=PATH+f"/{hash_id}/{file.get('name')}"
                if (os.path.exists(file_path)):
                    print("write")
                    with open(file_path,"rb") as f:
                            print(file_path)
                            zip_file.write(file_path,os.path.basename(file_path))
        final_file.seek(0)
    
        content_type="application/zip"
    response=HttpResponse(final_file,content_type=content_type)
    response['Content-Disposition']=f'attachment;filename={filename}'
    return response

class FileDelete(APIView):
    def delete(request,*args,**kwargs):
        file_id=kwargs.get("file_id")
        hash_id=kwargs.get("hash_id")
        if file_id:
            split_files=file_id.split(',')
            files=FilesSerialzer(File.objects.select_related("upload").filter(id__in=split_files,upload_id__hash=hash_id),many=True).data

            for file in files:
                file_path=PATH+f"/{hash_id}/{file.get('name')}"
                os.remove(file_path)
            File.objects.filter(id__in=split_files,upload_id__hash=hash_id).delete()
            
        else:
            shutil.rmtree(PATH+f"/{hash_id}/")
            Upload.objects.filter(hash=hash_id).delete()
                    
        
        return Response({
        
        },status=status.HTTP_200_OK)    