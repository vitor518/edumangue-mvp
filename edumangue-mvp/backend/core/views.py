import csv
import io
import secrets
import string

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from academico.models import Matricula, Turma

from .models import Papel
from .permissions import IsCoordenador
from .serializers import LoginSerializer, TrocarSenhaSerializer, UsuarioResumoSerializer, UsuarioSerializer

Usuario = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


@api_view(["GET"])
def me(request):
    return Response(UsuarioResumoSerializer(request.user).data)


@api_view(["POST"])
def trocar_senha(request):
    s = TrocarSenhaSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    if not request.user.check_password(s.validated_data["senha_atual"]):
        return Response({"senha_atual": ["Senha atual incorreta."]}, status=400)
    request.user.set_password(s.validated_data["nova_senha"])
    request.user.save(update_fields=["password"])
    return Response({"ok": True})


class UsuarioViewSet(viewsets.ModelViewSet):
    """Cadastro de usuários da escola (coordenador)."""

    serializer_class = UsuarioSerializer
    permission_classes = [IsCoordenador]

    def get_queryset(self):
        qs = Usuario.objects.filter(escola=self.request.user.escola)
        papel = self.request.query_params.get("papel")
        if papel:
            qs = qs.filter(papel=papel)
        q = self.request.query_params.get("q")
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(username__icontains=q))
        return qs

    def destroy(self, request, *args, **kwargs):
        # Não apagamos usuários (histórico de notas/presença): apenas inativamos.
        obj = self.get_object()
        if obj.pk == request.user.pk:
            return Response({"detail": "Você não pode desativar a si mesmo."}, status=400)
        obj.is_active = False
        obj.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


def _senha_temporaria(n=10):
    alfabeto = string.ascii_letters.replace("l", "").replace("I", "").replace("O", "") + string.digits.replace("0", "")
    return "".join(secrets.choice(alfabeto) for _ in range(n))


class ImportarUsuariosView(APIView):
    """POST multipart `arquivo` (CSV). Colunas: nome, usuario, email, papel, turma, responsavel, senha.
    Aceita separador `,` ou `;`. Linhas com erro não impedem as demais."""

    permission_classes = [IsCoordenador]
    parser_classes = [MultiPartParser]
    MAX_BYTES = 1_000_000
    MAX_LINHAS = 2000

    def post(self, request):
        arquivo = request.FILES.get("arquivo")
        if not arquivo:
            return Response({"detail": "Envie o arquivo CSV no campo 'arquivo'."}, status=400)
        if arquivo.size > self.MAX_BYTES:
            return Response({"detail": "Arquivo maior que 1 MB."}, status=400)
        try:
            texto = arquivo.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response({"detail": "Salve o CSV em UTF-8."}, status=400)

        try:
            dialeto = csv.Sniffer().sniff(texto[:2000], delimiters=",;")
        except csv.Error:
            dialeto = csv.excel
        leitor = csv.DictReader(io.StringIO(texto), dialect=dialeto)
        leitor.fieldnames = [(c or "").strip().lower() for c in (leitor.fieldnames or [])]
        obrigatorias = {"nome", "usuario", "papel"}
        if not obrigatorias.issubset(leitor.fieldnames):
            return Response({"detail": f"Colunas obrigatórias: {', '.join(sorted(obrigatorias))}."}, status=400)

        escola = request.user.escola
        turmas = {t.nome.lower(): t for t in Turma.objects.filter(escola=escola)}
        criados, erros = [], []

        for n, linha in enumerate(leitor, start=2):
            if n - 1 > self.MAX_LINHAS:
                erros.append({"linha": n, "erro": f"Limite de {self.MAX_LINHAS} linhas atingido."})
                break
            g = lambda k: (linha.get(k) or "").strip()
            papel, login = g("papel").lower(), g("usuario")
            if papel not in Papel.values:
                erros.append({"linha": n, "erro": f"Papel inválido: '{papel}'."})
                continue
            if not login or not g("nome"):
                erros.append({"linha": n, "erro": "Nome e usuário são obrigatórios."})
                continue
            turma = None
            if papel == Papel.ALUNO and g("turma"):
                turma = turmas.get(g("turma").lower())
                if not turma:
                    erros.append({"linha": n, "erro": f"Turma '{g('turma')}' não existe."})
                    continue
            nome, _, sobrenome = g("nome").partition(" ")
            senha = g("senha") or _senha_temporaria()
            try:
                with transaction.atomic():
                    u = Usuario(username=login, first_name=nome, last_name=sobrenome, email=g("email"),
                                papel=papel, escola=escola, responsavel=g("responsavel"))
                    u.set_password(senha)
                    u.save()
                    if turma:
                        Matricula.objects.create(turma=turma, aluno=u)
            except IntegrityError:
                erros.append({"linha": n, "erro": f"Usuário '{login}' já existe."})
                continue
            criados.append({"usuario": login, "nome": g("nome"), "papel": papel,
                            "turma": turma.nome if turma else "", "senha_temporaria": senha if not g("senha") else ""})

        return Response({"criados": criados, "erros": erros}, status=201 if criados else 200)
