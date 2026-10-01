from datetime import date

from django.db import transaction
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response

from core.models import Papel
from core.permissions import IsAluno, IsCoordenador, IsProfessorOuCoordenador

from . import selectors
from .frequencia import LIMITE_RISCO, frequencia_por_aluno, percentual
from .models import Alocacao, Aula, Disciplina, Matricula, Presenca, Turma
from .serializers import (AlocacaoSerializer, DisciplinaSerializer, MatriculaSerializer, TurmaSerializer)


class CoordenadorEscreveProfessorLe(BasePermission):
    """Coordenador: tudo. Professor: só leitura."""

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.escola_id):
            return False
        if u.papel == Papel.COORDENADOR:
            return True
        return u.papel == Papel.PROFESSOR and request.method in SAFE_METHODS


class _BaseEscolaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsCoordenador]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            raise ValidationError("Existem registros vinculados; não é possível excluir.")


class DisciplinaViewSet(_BaseEscolaViewSet):
    serializer_class = DisciplinaSerializer

    def get_queryset(self):
        return Disciplina.objects.filter(escola=self.request.user.escola)

    def perform_create(self, serializer):
        serializer.save(escola=self.request.user.escola)


class TurmaViewSet(_BaseEscolaViewSet):
    serializer_class = TurmaSerializer

    def get_queryset(self):
        return Turma.objects.filter(escola=self.request.user.escola)

    def perform_create(self, serializer):
        serializer.save(escola=self.request.user.escola)


class AlocacaoViewSet(_BaseEscolaViewSet):
    serializer_class = AlocacaoSerializer
    permission_classes = [CoordenadorEscreveProfessorLe]

    def get_queryset(self):
        u = self.request.user
        qs = Alocacao.objects.filter(turma__escola=u.escola).select_related("turma", "disciplina", "professor")
        if u.papel == Papel.PROFESSOR:
            qs = qs.filter(professor=u)
        return qs


class MatriculaViewSet(_BaseEscolaViewSet):
    serializer_class = MatriculaSerializer

    def get_queryset(self):
        qs = Matricula.objects.filter(turma__escola=self.request.user.escola).select_related("aluno", "turma")
        turma = self.request.query_params.get("turma")
        if turma:
            qs = qs.filter(turma_id=turma)
        return qs


# ---------------------------------------------------------------- helpers

def _alocacao_do_usuario(request, pk, escrita=False):
    """Professor: só as suas. Coordenador: leitura de qualquer da escola."""
    u = request.user
    aloc = get_object_or_404(
        Alocacao.objects.select_related("turma", "disciplina"), pk=pk, turma__escola=u.escola
    )
    if u.papel == Papel.PROFESSOR and aloc.professor_id != u.id:
        raise PermissionDenied("Esta turma não é sua.")
    if escrita and u.papel != Papel.PROFESSOR:
        raise PermissionDenied("Apenas o professor responsável registra a chamada.")
    return aloc


def _parse_data(valor):
    if not valor:
        return date.today()
    try:
        return date.fromisoformat(valor)
    except (TypeError, ValueError):
        raise ValidationError({"data": "Use o formato AAAA-MM-DD."})


# ---------------------------------------------------------------- professor

@api_view(["GET"])
@permission_classes([IsProfessorOuCoordenador])
def alunos_da_alocacao(request, pk):
    aloc = _alocacao_do_usuario(request, pk)
    return Response([
        {"id": m.aluno_id, "nome": m.aluno.nome_completo, "username": m.aluno.username}
        for m in selectors.alunos_da_turma(aloc.turma)
    ])


@api_view(["GET", "PUT"])
@permission_classes([IsProfessorOuCoordenador])
def chamada(request, pk):
    """GET  ?data=AAAA-MM-DD → lista de alunos com status (padrão: todos presentes, registrada=false).
    PUT  {data, tema, presencas:[{aluno, status}]} → grava tudo de uma vez (idempotente)."""
    aloc = _alocacao_do_usuario(request, pk, escrita=request.method == "PUT")
    matriculas = list(selectors.alunos_da_turma(aloc.turma))

    if request.method == "GET":
        dia = _parse_data(request.query_params.get("data"))
        aula = Aula.objects.filter(alocacao=aloc, data=dia).first()
        registros = {p.aluno_id: p.status for p in aula.presencas.all()} if aula else {}
        return Response({
            "data": dia, "tema": aula.tema if aula else "", "registrada": aula is not None,
            "alunos": [{"id": m.aluno_id, "nome": m.aluno.nome_completo,
                        "status": registros.get(m.aluno_id, Presenca.Status.PRESENTE)} for m in matriculas],
        })

    dia = _parse_data(request.data.get("data"))
    if dia > date.today():
        raise ValidationError({"data": "Não é possível registrar chamada em data futura."})
    itens = request.data.get("presencas")
    if not isinstance(itens, list):
        raise ValidationError({"presencas": "Envie a lista de presenças."})

    validos = {m.aluno_id for m in matriculas}
    status_ok = set(Presenca.Status.values)
    limpos = {}
    for it in itens:
        aluno_id = it.get("aluno") if isinstance(it, dict) else None
        st = it.get("status") if isinstance(it, dict) else None
        if aluno_id not in validos:
            raise ValidationError({"presencas": f"Aluno {aluno_id} não pertence à turma."})
        if st not in status_ok:
            raise ValidationError({"presencas": "Status inválido (use P, F ou J)."})
        limpos[aluno_id] = st

    tema = str(request.data.get("tema", ""))[:200]
    with transaction.atomic():
        aula, _ = Aula.objects.update_or_create(alocacao=aloc, data=dia, defaults={"tema": tema})
        for aluno_id, st in limpos.items():
            Presenca.objects.update_or_create(aula=aula, aluno_id=aluno_id, defaults={"status": st})
    return Response({"ok": True, "registrados": len(limpos), "data": dia})


@api_view(["GET"])
@permission_classes([IsProfessorOuCoordenador])
def frequencia_da_alocacao(request, pk):
    aloc = _alocacao_do_usuario(request, pk)
    stats = frequencia_por_aluno(Presenca.objects.filter(aula__alocacao=aloc))
    vazio = {"presentes": 0, "faltas": 0, "justificadas": 0, "percentual": None}
    alunos = []
    for m in selectors.alunos_da_turma(aloc.turma):
        s = stats.get(m.aluno_id, vazio)
        alunos.append({"id": m.aluno_id, "nome": m.aluno.nome_completo, **s,
                       "em_risco": s["percentual"] is not None and s["percentual"] < LIMITE_RISCO})
    return Response({"aulas_registradas": aloc.aulas.count(), "alunos": alunos})


# ---------------------------------------------------------------- aluno

@api_view(["GET"])
@permission_classes([IsAluno])
def minha_frequencia(request):
    user = request.user
    base = Presenca.objects.filter(aluno=user, aula__alocacao__turma__escola=user.escola)
    geral = frequencia_por_aluno(base).get(user.id) or {"presentes": 0, "faltas": 0, "justificadas": 0, "percentual": None}

    por_disc = {}
    for p in base.select_related("aula__alocacao__disciplina"):
        d = por_disc.setdefault(p.aula.alocacao.disciplina.nome, {"P": 0, "F": 0, "J": 0})
        d[p.status] += 1
    disciplinas = [
        {"disciplina": nome, "presentes": c["P"], "faltas": c["F"], "justificadas": c["J"],
         "percentual": percentual(c["P"], c["F"], c["J"])}
        for nome, c in sorted(por_disc.items())
    ]
    faltas = [
        {"data": p.aula.data, "disciplina": p.aula.alocacao.disciplina.nome, "status": p.status}
        for p in base.exclude(status=Presenca.Status.PRESENTE).select_related("aula__alocacao__disciplina").order_by("-aula__data")[:30]
    ]
    return Response({"geral": geral, "limite": LIMITE_RISCO, "disciplinas": disciplinas, "faltas_recentes": faltas})
