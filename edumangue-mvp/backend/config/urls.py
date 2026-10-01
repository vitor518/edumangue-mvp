from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/", include("academico.urls")),
    path("api/", include("atividades.urls")),
    path("api/", include("comunicacao.urls")),
]
