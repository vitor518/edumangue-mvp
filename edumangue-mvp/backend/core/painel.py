"""Painéis agregados por papel (aluno, professor, coordenador)."""
from datetime import date

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from academico import selectors
from academico.frequencia import LIMITE_RISCO, frequencia_por_aluno, percentual
from academico.models import Matricula, Presenca, Turma
from atividades.models import Atividade, Entrega
from comunicacao.models import Aviso, Evento

from .models import Papel, Usuario
from .permissions import IsAluno, IsCoordenador, IsProfessor

MIN_AULAS_RISCO = 3  # só sinaliza risco com pelo menos N registros


def _avisos_e_eventos(escola, turmas, limite_avisos=5, limite_eventos=8):
    filtro = Q(turma__isnull=True) | Q(turma__in=turmas)
    avisos = Aviso.objects.filter(escola=escola).filter(filtro).select_related("autor", "turma")[:limite_avisos]
    eventos = Evento.objects.filter(escola=escola, data__gte=date.today()).filter(filtro).select_related("turma")[:limite_eventos]
    return (
        [{"id": a.id, "titulo": a.titulo, "texto": a.texto, "autor": a.autor.nome_completo,
          "turma": a.turma.nome if a.turma else None, "criado_em": a.criado_em} for a in avisos],
        [{"id": e.id, "titulo": e.titulo, "tipo": e.tipo, "data": e.data,
          "turma": e.turma.nome if e.turma else None} for e in eventos],
    )


@api_view(["GET"])
@permission_classes([IsAluno])
def painel_aluno(request):
    user = request.user
    turmas = selectors.turmas_do_aluno(user)
    alocs = selectors.alocacoes_do_aluno(user)

    entregues = set(Entrega.objects.filter(aluno=user).values_list("atividade_id", flat=True))
    pendentes_qs = (
        Atividade.objects.filter(alocacao__in=alocs, publicada=True)
        .exclude(id__in=entregues).select_related("alocacao__disciplina")
    )
    agora = timezone.now()
    pendentes = sorted(pendentes_qs, key=lambda a: (a.prazo is None, a.prazo or agora))
    freq = frequencia_por_aluno(Presenca.objects.filter(aluno=user)).get(user.id)
    media = Entrega.objects.filter(aluno=user).aggregate(m=Avg("nota"))["m"]
    avisos, eventos = _avisos_e_eventos(user.escola, turmas)

    return Response({
        "turmas": [t.nome for t in turmas],
        "pendentes": [{
            "id": a.id, "titulo": a.titulo, "tipo": a.tipo, "prazo": a.prazo,
            "disciplina": a.alocacao.disciplina.nome, "atrasada": bool(a.prazo and a.prazo < agora),
        } for a in pendentes],
        "frequencia": freq or {"presentes": 0, "faltas": 0, "justificadas": 0, "percentual": None},
        "media": round(float(media), 1) if media is not None else None,
        "entregas_feitas": len(entregues),
        "avisos": avisos,
        "eventos": eventos,
    })


@api_view(["GET"])
@permission_classes([IsProfessor])
def painel_professor(request):
    user = request.user
    alocs = list(selectors.alocacoes_do_professor(user))
    hoje = date.today()
    ids = [a.id for a in alocs]
    chamadas_hoje = set(
        Presenca.objects.filter(aula__alocacao_id__in=ids, aula__data=hoje).values_list("aula__alocacao_id", flat=True)
    )
    turmas = selectors.turmas_do_professor(user)
    a_corrigir = (
        Atividade.objects.filter(alocacao_id__in=ids, publicada=True)
        .annotate(n=Count("entregas")).values("id", "n")
    )
    entregas_total = sum(x["n"] for x in a_corrigir)
    avisos, eventos = _avisos_e_eventos(user.escola, turmas)
    return Response({
        "alocacoes": [{
            "id": a.id, "turma": a.turma.nome, "disciplina": a.disciplina.nome,
            "chamada_feita_hoje": a.id in chamadas_hoje,
            "alunos": a.turma.matriculas.filter(ativa=True).count(),
        } for a in alocs],
        "atividades_publicadas": len(a_corrigir),
        "entregas_recebidas": entregas_total,
        "avisos": avisos,
        "eventos": eventos,
    })


@api_view(["GET"])
@permission_classes([IsCoordenador])
def dashboard_coordenador(request):
    escola = request.user.escola
    pres = Presenca.objects.filter(aula__alocacao__turma__escola=escola)
    por_aluno = frequencia_por_aluno(pres)

    matriculas = list(Matricula.objects.filter(turma__escola=escola, ativa=True).select_related("aluno", "turma"))

    # Frequência por turma
    por_turma = {}
    for m in matriculas:
        f = por_aluno.get(m.aluno_id)
        d = por_turma.setdefault(m.turma_id, {"turma": m.turma.nome, "alunos": 0, "presentes": 0, "faltas": 0})
        d["alunos"] += 1
        if f:
            d["presentes"] += f["presentes"]
            d["faltas"] += f["faltas"]
    turmas_freq = sorted((
        {"turma": d["turma"], "alunos": d["alunos"], "percentual": percentual(d["presentes"], d["faltas"])}
        for d in por_turma.values()
    ), key=lambda x: x["turma"])

    # Alunos em risco de reprovação por falta
    risco = []
    for m in matriculas:
        f = por_aluno.get(m.aluno_id)
        if f and f["presentes"] + f["faltas"] >= MIN_AULAS_RISCO and f["percentual"] < LIMITE_RISCO:
            risco.append({"id": m.aluno_id, "aluno": m.aluno.nome_completo, "turma": m.turma.nome,
                          "faltas": f["faltas"], "percentual": f["percentual"]})
    risco.sort(key=lambda x: x["percentual"])

    # Atividades
    publicadas = Atividade.objects.filter(alocacao__turma__escola=escola, publicada=True)
    n_publicadas = publicadas.count()
    esperado = sum(
        Matricula.objects.filter(turma_id=a["alocacao__turma_id"], ativa=True).count()
        for a in publicadas.values("alocacao__turma_id")
    )
    recebidas = Entrega.objects.filter(atividade__in=publicadas).count()
    media = Entrega.objects.filter(atividade__in=publicadas).aggregate(m=Avg("nota"))["m"]

    return Response({
        "totais": {
            "alunos": Usuario.objects.filter(escola=escola, papel=Papel.ALUNO, is_active=True).count(),
            "professores": Usuario.objects.filter(escola=escola, papel=Papel.PROFESSOR, is_active=True).count(),
            "turmas": Turma.objects.filter(escola=escola).count(),
        },
        "frequencia_turmas": turmas_freq,
        "frequencia_geral": percentual(
            sum(d["presentes"] for d in por_turma.values()), sum(d["faltas"] for d in por_turma.values())),
        "alunos_em_risco": risco,
        "limite_risco": LIMITE_RISCO,
        "atividades": {
            "publicadas": n_publicadas, "entregas": recebidas, "esperadas": esperado,
            "taxa_entrega": round(100 * recebidas / esperado, 1) if esperado else None,
            "media_notas": round(float(media), 1) if media is not None else None,
        },
    })
