"""Consultas reutilizadas entre apps (sempre restritas à escola do usuário)."""
from .models import Alocacao, Matricula, Turma


def turmas_do_aluno(user):
    return Turma.objects.filter(matriculas__aluno=user, matriculas__ativa=True, escola=user.escola)


def alocacoes_do_aluno(user):
    return Alocacao.objects.filter(turma__in=turmas_do_aluno(user)).select_related("disciplina", "turma", "professor")


def alocacoes_do_professor(user):
    return Alocacao.objects.filter(professor=user, turma__escola=user.escola).select_related("disciplina", "turma")


def turmas_do_professor(user):
    return Turma.objects.filter(alocacoes__professor=user, escola=user.escola).distinct()


def alunos_da_turma(turma):
    return (
        Matricula.objects.filter(turma=turma, ativa=True)
        .select_related("aluno")
        .order_by("aluno__first_name", "aluno__last_name", "aluno__username")
    )
