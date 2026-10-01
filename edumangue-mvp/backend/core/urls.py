from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import painel, views

router = DefaultRouter()
router.register("usuarios", views.UsuarioViewSet, basename="usuario")

urlpatterns = [
    path("auth/login/", views.LoginView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/me/", views.me),
    path("auth/senha/", views.trocar_senha),
    path("usuarios/importar/", views.ImportarUsuariosView.as_view()),
    path("coordenador/dashboard/", painel.dashboard_coordenador),
    path("professor/painel/", painel.painel_professor),
    path("aluno/painel/", painel.painel_aluno),
    path("", include(router.urls)),
]
