from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("disciplinas", views.DisciplinaViewSet, basename="disciplina")
router.register("turmas", views.TurmaViewSet, basename="turma")
router.register("alocacoes", views.AlocacaoViewSet, basename="alocacao")
router.register("matriculas", views.MatriculaViewSet, basename="matricula")

urlpatterns = [
    path("alocacoes/<int:pk>/alunos/", views.alunos_da_alocacao),
    path("alocacoes/<int:pk>/chamada/", views.chamada),
    path("alocacoes/<int:pk>/frequencia/", views.frequencia_da_alocacao),
    path("aluno/frequencia/", views.minha_frequencia),
    path("", include(router.urls)),
]
