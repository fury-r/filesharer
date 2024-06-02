from django.db import models

# Create your models here.
class BlogPost(models.Model):
    title=models.CharField(max_length=100)
    content=models.TextField()
    published_date=models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.title
    


class Upload(models.Model):
    hash=models.CharField(max_length=999)
    total_files=models.IntegerField(max_length=99)
    published_date=models.DateTimeField(auto_now_add=True)



class File(models.Model):
    name=models.CharField(max_length=999)
    upload=models.ForeignKey(Upload,on_delete=models.CASCADE)
    content_type=models.CharField(max_length=99)

    size=models.CharField(max_length=999)
