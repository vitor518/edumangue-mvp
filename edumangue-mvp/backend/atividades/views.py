from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from academico import selectors
from core.permissions import IsAluno, IsProfessor

from .conteudo import conteudo_para_aluno, corrigir
from .models import Atividade, Entrega
from .serializers import AtividadeSerializer


class AtividadeViewSet(viewsets.ModelViewSet):
    """CRUD de atividades do professor (somente as suas)."""

    serializer_class = AtividadeSerializer
    permission_classes = [IsProfessor]

    def get_queryset(self):
        qs = Atividade.objects.filter(
            alocacao__professor=self.request.user, alocacao__turma__escola=self.request.user.escola
        ).select_related("alocacao__turma", "alocacao__disciplina")
        aloc = self.request.query_params.get("alocacao")
        return qs.filter(alocacao_id=aloc) if aloc else qs

    @action(detail=True, methods=["get"])
    def resultados(self, request, pk=None):
        ativ = self.get_object()
        entregas = {e.aluno_id: e for e in ativ.entregas.all()}
        linhas = []
        for m in selectors.alunos_da_turma(ativ.alocacao.turma):
            e = entregas.get(m.aluno_id)
            linhas.append({
                "aluno": m.aluno.nome_completo, "entregue": e is not None,
                "nota": float(e.nota) if e else None, "acertos": e.acertos if e else None,
                "total": e.total if e else None, "atrasada": e.atrasada if e else False,
                "entregue_em": e.entregue_em if e else None,
            })
        notas = [l["nota"] for l in linhas if l["nota"] is not None]
        return Response({
            "atividade": ativ.titulo, "tipo": ativ.tipo,
            "media": round(sum(notas) / len(notas), 1) if notas else None,
            "entregues": len(notas), "total_alunos": len(linhas), "alunos": linhas,
        })


def _atividade_do_aluno(request, pk):
    alocs = selectors.alocacoes_do_aluno(request.user)
    return get_object_or_404(
        Atividade.objects.select_related("alocacao__disciplina"), pk=pk, alocacao__in=alocs, publicada=True
    )


@api_view(["GET"])
@permission_classes([IsAluno])
def atividades_do_aluno(request):
    alocs = selectors.alocacoes_do_aluno(request.user)
    ativs = Atividade.objects.filter(alocacao__in=alocs, publicada=True).select_related("alocacao__disciplina")
    entregas = {e.atividade_id: e for e in Entrega.objects.filter(aluno=request.user)}
    agora = timezone.now()
    return Response([{
        "id": a.id, "titulo": a.titulo, "tipo": a.tipo, "prazo": a.prazo,
        "disciplina": a.alocacao.disciplina.nome,
        "entregue": a.id in entregas,
        "nota": float(entregas[a.id].nota) if a.id in entregas else None,
        "atrasada": a.id not in entregas and bool(a.prazo and a.prazo < agora),
    } for a in ativs])


@api_view(["GET"])
@permission_classes([IsAluno])
def atividade_do_aluno(request, pk):
    a = _atividade_do_aluno(request, pk)
    entrega = Entrega.objects.filter(atividade=a, aluno=request.user).first()
    return Response({
        "id": a.id, "titulo": a.titulo, "descricao": a.descricao, "tipo": a.tipo, "prazo": a.prazo,
        "disciplina": a.alocacao.disciplina.nome,
        "conteudo": conteudo_para_aluno(a.tipo, a.conteudo),  # sem gabarito
        "entrega": {"nota": float(entrega.nota), "acertos": entrega.acertos, "total": entrega.total,
                    "atrasada": entrega.atrasada} if entrega else None,
    })


@api_view(["POST"])
@permission_classes([IsAluno])
def entregar_atividade(request, pk):
    a = _atividade_do_aluno(request, pk)
    if Entrega.objects.filter(atividade=a, aluno=request.user).exists():
        raise ValidationError("Você já entregou esta atividade.")
    resultado = corrigir(a.tipo, a.conteudo, request.data)
    agora = timezone.now()
    try:
        Entrega.objects.create(
            atividade=a, aluno=request.user, respostas=request.data, nota=resultado["nota"],
            acertos=resultado["acertos"], total=resultado["total"], atrasada=bool(a.prazo and a.prazo < agora),
        )
    except IntegrityError:  # duplo clique / requisições simultâneas
        raise ValidationError("Você já entregou esta atividade.")
    return Response({
        "nota": float(resultado["nota"]), "acertos": resultado["acertos"],
        "total": resultado["total"], "feedback": resultado["feedback"],
    }, status=201)
