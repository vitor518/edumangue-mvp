"""Cria uma escola demo com os três perfis, turma, chamadas e atividades (pacote 'Mangues')."""
import json
import random
from datetime import date, timedelta
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from academico.models import Alocacao, Aula, Disciplina, Matricula, Presenca, Turma
from atividades.models import Atividade, Entrega
from atividades.conteudo import corrigir
from comunicacao.models import Aviso, Evento
from core.models import Escola, Papel, Usuario

SENHA = "demo1234"
ALUNOS = ["Ana Souza", "Bruno Lima", "Carla Dias", "Diego Rocha", "Eduarda Alves", "Felipe Costa",
          "Gabriela Nunes", "Hugo Martins"]


class Command(BaseCommand):
    help = "Popula o banco com dados de demonstração (senha de todos: demo1234)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Apaga a escola demo antes de recriar.")

    @transaction.atomic
    def handle(self, *args, **opts):
        if Escola.objects.filter(slug="demo").exists():
            if not opts["reset"]:
                raise CommandError("Escola demo já existe. Use --reset para recriar.")
            Usuario.objects.filter(escola__slug="demo").delete()
            Escola.objects.filter(slug="demo").delete()

        pacote = json.loads((Path(__file__).resolve().parents[2] / "seed" / "mangues.json").read_text(encoding="utf-8"))
        rnd = random.Random(42)

        escola = Escola.objects.create(nome="Escola Demo Mangue Verde", slug="demo")

        def user(login, nome, papel, **extra):
            n, _, s = nome.partition(" ")
            u = Usuario(username=login, first_name=n, last_name=s, papel=papel, escola=escola,
                        email=f"{login}@demo.edu", consentimento_lgpd=True, **extra)
            u.set_password(SENHA)
            u.save()
            return u

        user("coord", "Marina Coordenadora", Papel.COORDENADOR)
        prof = user("prof", "Paulo Professor", Papel.PROFESSOR)
        prof2 = user("prof2", "Renata Ribeiro", Papel.PROFESSOR)
        alunos = [user(f"aluno{i}" if i else "aluno", nome, Papel.ALUNO, responsavel="Responsável Demo")
                  for i, nome in enumerate(ALUNOS)]

        ciencias = Disciplina.objects.create(escola=escola, nome="Ciências")
        geo = Disciplina.objects.create(escola=escola, nome="Geografia")
        turma = Turma.objects.create(escola=escola, nome="6º A", ano_letivo=date.today().year)
        turma2 = Turma.objects.create(escola=escola, nome="6º B", ano_letivo=date.today().year)
        for a in alunos:
            Matricula.objects.create(turma=turma, aluno=a)

        aloc = Alocacao.objects.create(turma=turma, disciplina=ciencias, professor=prof)
        Alocacao.objects.create(turma=turma2, disciplina=ciencias, professor=prof)
        Alocacao.objects.create(turma=turma, disciplina=geo, professor=prof2)

        # 12 dias letivos de chamada; Diego e Hugo faltam bastante (aparecem como "em risco")
        dia, feitas = date.today() - timedelta(days=1), 0
        while feitas < 12:
            if dia.weekday() < 5:
                aula = Aula.objects.create(alocacao=aloc, data=dia, tema="Ecossistemas costeiros")
                for a in alunos:
                    chance_falta = 0.55 if a.first_name in ("Diego", "Hugo") else 0.06
                    st = "F" if rnd.random() < chance_falta else "P"
                    if st == "F" and rnd.random() < 0.15:
                        st = "J"
                    Presenca.objects.create(aula=aula, aluno=a, status=st)
                feitas += 1
            dia -= timedelta(days=1)

        agora = timezone.now()
        quiz = Atividade.objects.create(
            alocacao=aloc, titulo="Quiz: Manguezais", tipo="quiz", conteudo=pacote["quiz"], publicada=True,
            descricao="Teste o que você sabe sobre os manguezais brasileiros.", prazo=agora + timedelta(days=5))
        mem = Atividade.objects.create(
            alocacao=aloc, titulo="Memória: Bichos do mangue", tipo="memoria", conteudo=pacote["memoria"],
            publicada=True, descricao="Encontre os pares de espécies.", prazo=agora + timedelta(days=7))
        con = Atividade.objects.create(
            alocacao=aloc, titulo="Conexões: Superpoderes ecológicos", tipo="conexoes", conteudo=pacote["conexoes"],
            publicada=True, descricao="Ligue cada espécie ao seu papel no ecossistema.", prazo=agora + timedelta(days=10))
        Atividade.objects.create(
            alocacao=aloc, titulo="Quiz: rascunho (não publicado)", tipo="quiz", conteudo=pacote["quiz"], publicada=False)

        # Algumas entregas de exemplo para o professor ver resultados
        for a in alunos[:5]:
            respostas = [p["correta"] if rnd.random() > 0.3 else 0 for p in pacote["quiz"]["perguntas"]]
            r = corrigir("quiz", quiz.conteudo, {"respostas": respostas})
            Entrega.objects.create(atividade=quiz, aluno=a, respostas={"respostas": respostas}, nota=r["nota"],
                                   acertos=r["acertos"], total=r["total"])

        Aviso.objects.create(escola=escola, autor=Usuario.objects.get(username="coord"),
                             titulo="Bem-vindos ao EduMangue!", texto="Use o portal para acompanhar atividades, agenda e frequência.")
        Aviso.objects.create(escola=escola, turma=turma, autor=prof, titulo="Trabalho de campo",
                             texto="Tragam caderno e boné para a visita ao manguezal.")
        Evento.objects.create(escola=escola, turma=turma, autor=prof, titulo="Prova de Ciências", tipo="prova",
                              data=date.today() + timedelta(days=12))
        Evento.objects.create(escola=escola, autor=Usuario.objects.get(username="coord"), titulo="Reunião de pais",
                              tipo="reuniao", data=date.today() + timedelta(days=20))

        self.stdout.write(self.style.SUCCESS(
            f"Demo criada. Logins: coord / prof / prof2 / aluno / aluno1..aluno7 — senha: {SENHA}"))
