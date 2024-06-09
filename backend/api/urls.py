from django.urls import path
from . import views


urlpatterns=[
    path("blogposts/",views.BlogPostListCreate.as_view(),name="blogpost-view-create"),
    path("blogposts/<int:pk>/",views.BlogPostListRetrieveUpdateDestroy.as_view(),name="update"),
    path("blogpost/",views.BlogPostList.as_view(),name="get"),
    path("v1/file/upload/",views.FileUploadView.as_view(),name="file-upload"),
    path("v1/file/get/",views.QRValidationView.as_view(),name="file-qr"),
    path("v1/file/delete/<str:hash_id>/",views.FileDelete.as_view(),name="file-delete-all"),
    path("v1/file/delete/<str:hash_id>/<str:file_id>/",views.FileDelete.as_view(),name="file-delete"),
    path("v1/file/live/session/",views.LiveShare.as_view(),name="file-live-session"),
    path("v1/file/live/session/<str:hash>/",views.LiveShare.as_view(),name="file-live-session-upload"),
    path("v1/file/download/<str:hash_id>/",views.download_file,name="file-zip-download"),
    path("v1/file/download/<str:hash_id>/<str:file_id>/",views.download_file,name="file-download"),

]