from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("avisos", views.AvisoViewSet, basename="aviso")
router.register("eventos", views.EventoViewSet, basename="evento")

urlpatterns = [path("", include(router.urls))]
