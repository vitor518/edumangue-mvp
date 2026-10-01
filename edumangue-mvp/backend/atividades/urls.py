from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("atividades", views.AtividadeViewSet, basename="atividade")

urlpatterns = [
    path("aluno/atividades/", views.atividades_do_aluno),
    path("aluno/atividades/<int:pk>/", views.atividade_do_aluno),
    path("aluno/atividades/<int:pk>/entregar/", views.entregar_atividade),
    path("", include(router.urls)),
]
