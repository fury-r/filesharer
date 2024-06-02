from rest_framework import serializers
from .models import BlogPost, Upload,File

class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model=BlogPost
        fields=["id","title","content","published_date"]


class UploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Upload
        fields = '__all__'


class FilesSerialzer(serializers.ModelSerializer):
    upload = UploadSerializer(read_only=True) 
    upload_id = serializers.PrimaryKeyRelatedField(queryset=Upload.objects.all(), source='upload') 
    class Meta:
        model = File
        fields = '__all__' 