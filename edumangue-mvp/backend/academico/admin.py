from django.contrib import admin

from .models import Alocacao, Aula, Disciplina, Matricula, Presenca, Turma

for m in (Disciplina, Turma, Alocacao, Matricula, Aula, Presenca):
    admin.site.register(m)
