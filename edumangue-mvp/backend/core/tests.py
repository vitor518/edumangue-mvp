from datetime import date, timedelta
from io import BytesIO

from django.test import TestCase
from rest_framework.test import APIClient

from academico.models import Alocacao, Aula, Disciplina, Matricula, Presenca, Turma
from atividades.models import Atividade, Entrega
from comunicacao.models import Aviso
from core.models import Escola, Usuario

QUIZ = {"perguntas": [
    {"enunciado": "2+2?", "opcoes": ["3", "4"], "correta": 1, "explicacao": "aritmética"},
    {"enunciado": "Capital do Brasil?", "opcoes": ["Rio", "Brasília", "SP"], "correta": 1, "explicacao": ""},
]}


def mk(escola, login, papel, **kw):
    u = Usuario(username=login, first_name=login.title(), papel=papel, escola=escola, **kw)
    u.set_password("senha-forte-123")
    u.save()
    return u


class Base(TestCase):
    def setUp(self):
        self.esc = Escola.objects.create(nome="A", slug="a")
        self.outra = Escola.objects.create(nome="B", slug="b")
        self.coord = mk(self.esc, "coord", "coordenador")
        self.prof = mk(self.esc, "prof", "professor")
        self.prof2 = mk(self.esc, "prof2", "professor")
        self.al1 = mk(self.esc, "al1", "aluno")
        self.al2 = mk(self.esc, "al2", "aluno")
        self.fora = mk(self.outra, "fora", "aluno")
        self.turma = Turma.objects.create(escola=self.esc, nome="6A")
        self.disc = Disciplina.objects.create(escola=self.esc, nome="Cien")
        for a in (self.al1, self.al2):
            Matricula.objects.create(turma=self.turma, aluno=a)
        self.aloc = Alocacao.objects.create(turma=self.turma, disciplina=self.disc, professor=self.prof)

    def cli(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def quiz(self, publicada=True, **kw):
        return Atividade.objects.create(alocacao=self.aloc, titulo="Q", tipo="quiz", conteudo=QUIZ, publicada=publicada, **kw)


class AuthTests(Base):
    def test_login_retorna_token_e_usuario(self):
        r = APIClient().post("/api/auth/login/", {"username": "al1", "password": "senha-forte-123"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
        self.assertEqual(r.data["usuario"]["papel"], "aluno")

    def test_login_invalido(self):
        r = APIClient().post("/api/auth/login/", {"username": "al1", "password": "x"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_sem_token_bloqueado(self):
        self.assertEqual(APIClient().get("/api/aluno/painel/").status_code, 401)

    def test_papel_errado_bloqueado(self):
        self.assertEqual(self.cli(self.al1).get("/api/coordenador/dashboard/").status_code, 403)
        self.assertEqual(self.cli(self.prof).get("/api/aluno/painel/").status_code, 403)
        self.assertEqual(self.cli(self.al1).get("/api/usuarios/").status_code, 403)
        self.assertEqual(self.cli(self.prof).post("/api/turmas/", {"nome": "x"}, format="json").status_code, 403)


class TenantTests(Base):
    def test_coordenador_nao_ve_outra_escola(self):
        r = self.cli(self.coord).get("/api/usuarios/")
        logins = {u["username"] for u in r.data}
        self.assertNotIn("fora", logins)
        self.assertEqual(self.cli(self.coord).get(f"/api/usuarios/{self.fora.id}/").status_code, 404)

    def test_nao_matricula_aluno_de_outra_escola(self):
        r = self.cli(self.coord).post("/api/matriculas/", {"turma": self.turma.id, "aluno": self.fora.id}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_usuario_criado_herda_escola_do_coordenador(self):
        r = self.cli(self.coord).post("/api/usuarios/", {
            "username": "novo", "first_name": "Novo", "papel": "aluno", "password": "senha-forte-123",
            "escola": self.outra.id}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Usuario.objects.get(username="novo").escola_id, self.esc.id)

    def test_desativar_em_vez_de_apagar(self):
        r = self.cli(self.coord).delete(f"/api/usuarios/{self.al1.id}/")
        self.assertEqual(r.status_code, 204)
        self.al1.refresh_from_db()
        self.assertFalse(self.al1.is_active)


class ChamadaTests(Base):
    url = property(lambda s: f"/api/alocacoes/{s.aloc.id}/chamada/")

    def test_get_padrao_todos_presentes(self):
        r = self.cli(self.prof).get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["registrada"])
        self.assertTrue(all(a["status"] == "P" for a in r.data["alunos"]))

    def test_salvar_e_reler(self):
        c = self.cli(self.prof)
        body = {"data": str(date.today()), "tema": "Aula 1",
                "presencas": [{"aluno": self.al1.id, "status": "P"}, {"aluno": self.al2.id, "status": "F"}]}
        self.assertEqual(c.put(self.url, body, format="json").status_code, 200)
        r = c.get(self.url, {"data": str(date.today())})
        st = {a["id"]: a["status"] for a in r.data["alunos"]}
        self.assertEqual(st[self.al2.id], "F")
        self.assertTrue(r.data["registrada"])

    def test_salvar_duas_vezes_nao_duplica(self):
        c = self.cli(self.prof)
        body = {"data": str(date.today()), "presencas": [{"aluno": self.al1.id, "status": "F"}]}
        c.put(self.url, body, format="json")
        body["presencas"][0]["status"] = "P"
        c.put(self.url, body, format="json")
        self.assertEqual(Aula.objects.count(), 1)
        self.assertEqual(Presenca.objects.get(aluno=self.al1).status, "P")

    def test_data_futura_rejeitada(self):
        body = {"data": str(date.today() + timedelta(days=1)), "presencas": []}
        self.assertEqual(self.cli(self.prof).put(self.url, body, format="json").status_code, 400)

    def test_aluno_de_fora_da_turma_rejeitado(self):
        body = {"data": str(date.today()), "presencas": [{"aluno": self.fora.id, "status": "P"}]}
        self.assertEqual(self.cli(self.prof).put(self.url, body, format="json").status_code, 400)

    def test_status_invalido(self):
        body = {"data": str(date.today()), "presencas": [{"aluno": self.al1.id, "status": "X"}]}
        self.assertEqual(self.cli(self.prof).put(self.url, body, format="json").status_code, 400)

    def test_outro_professor_nao_acessa(self):
        self.assertEqual(self.cli(self.prof2).get(self.url).status_code, 403)

    def test_coordenador_le_mas_nao_grava(self):
        c = self.cli(self.coord)
        self.assertEqual(c.get(self.url).status_code, 200)
        self.assertEqual(c.put(self.url, {"data": str(date.today()), "presencas": []}, format="json").status_code, 403)


class AtividadeTests(Base):
    def test_aluno_nao_ve_gabarito(self):
        a = self.quiz()
        r = self.cli(self.al1).get(f"/api/aluno/atividades/{a.id}/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("correta", str(r.data["conteudo"]))
        self.assertNotIn("explicacao", str(r.data["conteudo"]))

    def test_aluno_nao_ve_nao_publicada_nem_de_outra_turma(self):
        a = self.quiz(publicada=False)
        self.assertEqual(self.cli(self.al1).get(f"/api/aluno/atividades/{a.id}/").status_code, 404)
        b = self.quiz()
        self.assertEqual(self.cli(self.fora).get(f"/api/aluno/atividades/{b.id}/").status_code, 404)

    def test_quiz_correcao(self):
        a = self.quiz()
        r = self.cli(self.al1).post(f"/api/aluno/atividades/{a.id}/entregar/", {"respostas": [1, 0]}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["acertos"], 1)
        self.assertEqual(r.data["nota"], 5.0)
        self.assertEqual(r.data["feedback"][0]["correta"], 1)

    def test_nao_entrega_duas_vezes(self):
        a = self.quiz()
        c = self.cli(self.al1)
        c.post(f"/api/aluno/atividades/{a.id}/entregar/", {"respostas": [1, 1]}, format="json")
        r = c.post(f"/api/aluno/atividades/{a.id}/entregar/", {"respostas": [1, 1]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Entrega.objects.count(), 1)

    def test_respostas_malformadas(self):
        a = self.quiz()
        c = self.cli(self.al1)
        for body in ({"respostas": [1]}, {"respostas": [1, 9]}, {"respostas": "x"}, {"respostas": [True, 1]}, {}):
            self.assertEqual(c.post(f"/api/aluno/atividades/{a.id}/entregar/", body, format="json").status_code, 400, body)

    def test_conexoes(self):
        a = Atividade.objects.create(alocacao=self.aloc, titulo="C", tipo="conexoes", publicada=True,
                                     conteudo={"pares": [{"esquerda": "A", "direita": "1"}, {"esquerda": "B", "direita": "2"}]})
        c = self.cli(self.al1)
        v = c.get(f"/api/aluno/atividades/{a.id}/").data["conteudo"]
        self.assertEqual(sorted(v["esquerda"]), ["A", "B"])
        r = c.post(f"/api/aluno/atividades/{a.id}/entregar/", {"ligacoes": {"A": "1", "B": "1"}}, format="json")
        self.assertEqual(r.data["acertos"], 1)

    def test_memoria_nota_por_eficiencia(self):
        a = Atividade.objects.create(alocacao=self.aloc, titulo="M", tipo="memoria", publicada=True,
                                     conteudo={"pares": [{"nome": "a", "imagem": ""}, {"nome": "b", "imagem": ""}]})
        c = self.cli(self.al1)
        self.assertEqual(c.post(f"/api/aluno/atividades/{a.id}/entregar/", {"tentativas": 1, "tempo": 5}, format="json").status_code, 400)
        r = c.post(f"/api/aluno/atividades/{a.id}/entregar/", {"tentativas": 4, "tempo": 20}, format="json")
        self.assertEqual(r.data["nota"], 5.0)

    def test_atraso_marcado(self):
        from django.utils import timezone
        a = self.quiz(prazo=timezone.now() - timedelta(days=1))
        r = self.cli(self.al1).post(f"/api/aluno/atividades/{a.id}/entregar/", {"respostas": [1, 1]}, format="json")
        self.assertTrue(Entrega.objects.get().atrasada)
        self.assertEqual(r.data["nota"], 10.0)

    def test_professor_cria_valida_e_isola(self):
        body = {"alocacao": self.aloc.id, "titulo": "Novo", "tipo": "quiz", "conteudo": QUIZ, "publicada": True}
        self.assertEqual(self.cli(self.prof).post("/api/atividades/", body, format="json").status_code, 201)
        self.assertEqual(self.cli(self.prof2).post("/api/atividades/", body, format="json").status_code, 400)
        ruim = {**body, "conteudo": {"perguntas": [{"enunciado": "x", "opcoes": ["a", "b"], "correta": 5}]}}
        self.assertEqual(self.cli(self.prof).post("/api/atividades/", ruim, format="json").status_code, 400)

    def test_conteudo_travado_apos_entrega(self):
        a = self.quiz()
        self.cli(self.al1).post(f"/api/aluno/atividades/{a.id}/entregar/", {"respostas": [1, 1]}, format="json")
        r = self.cli(self.prof).patch(f"/api/atividades/{a.id}/", {"conteudo": QUIZ}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.cli(self.prof).patch(f"/api/atividades/{a.id}/", {"titulo": "Renomeado"}, format="json")
        self.assertEqual(r.status_code, 200)

    def test_resultados(self):
        a = self.quiz()
        self.cli(self.al1).post(f"/api/aluno/atividades/{a.id}/entregar/", {"respostas": [1, 1]}, format="json")
        r = self.cli(self.prof).get(f"/api/atividades/{a.id}/resultados/")
        self.assertEqual(r.data["entregues"], 1)
        self.assertEqual(r.data["total_alunos"], 2)
        self.assertEqual(self.cli(self.prof2).get(f"/api/atividades/{a.id}/resultados/").status_code, 404)


class FrequenciaEDashboardTests(Base):
    def _chamadas(self, n, faltas_al2):
        for i in range(n):
            aula = Aula.objects.create(alocacao=self.aloc, data=date.today() - timedelta(days=i + 1))
            Presenca.objects.create(aula=aula, aluno=self.al1, status="P")
            Presenca.objects.create(aula=aula, aluno=self.al2, status="F" if i < faltas_al2 else "P")

    def test_risco_e_justificada(self):
        self._chamadas(8, 4)  # al2: 50%
        r = self.cli(self.coord).get("/api/coordenador/dashboard/")
        self.assertEqual([x["aluno"] for x in r.data["alunos_em_risco"]], ["Al2"])
        self.assertEqual(r.data["frequencia_turmas"][0]["percentual"], 75.0)
        Presenca.objects.filter(aluno=self.al2, status="F").update(status="J")
        r = self.cli(self.coord).get("/api/coordenador/dashboard/")
        self.assertEqual(r.data["alunos_em_risco"], [])

    def test_aluno_ve_sua_frequencia_e_painel(self):
        self._chamadas(4, 1)
        r = self.cli(self.al2).get("/api/aluno/frequencia/")
        self.assertEqual(r.data["geral"]["faltas"], 1)
        self.assertEqual(r.data["geral"]["percentual"], 75.0)
        self.quiz()
        p = self.cli(self.al2).get("/api/aluno/painel/")
        self.assertEqual(len(p.data["pendentes"]), 1)

    def test_professor_painel(self):
        self.assertEqual(self.cli(self.prof).get("/api/professor/painel/").status_code, 200)


class ComunicacaoTests(Base):
    def test_professor_nao_publica_para_escola_toda(self):
        r = self.cli(self.prof).post("/api/avisos/", {"titulo": "x", "texto": "y"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_visibilidade_por_turma(self):
        t2 = Turma.objects.create(escola=self.esc, nome="7B")
        Aviso.objects.create(escola=self.esc, turma=t2, autor=self.coord, titulo="so 7B", texto="t")
        Aviso.objects.create(escola=self.esc, autor=self.coord, titulo="geral", texto="t")
        r = self.cli(self.al1).get("/api/avisos/")
        self.assertEqual([a["titulo"] for a in r.data], ["geral"])

    def test_aluno_nao_publica(self):
        r = self.cli(self.al1).post("/api/avisos/", {"titulo": "x", "texto": "y", "turma": self.turma.id}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_professor_publica_na_sua_turma(self):
        r = self.cli(self.prof).post("/api/avisos/", {"titulo": "x", "texto": "y", "turma": self.turma.id}, format="json")
        self.assertEqual(r.status_code, 201)

    def test_professor_nao_edita_aviso_de_outro(self):
        av = Aviso.objects.create(escola=self.esc, turma=self.turma, autor=self.prof2, titulo="t", texto="t")
        self.assertEqual(self.cli(self.prof).delete(f"/api/avisos/{av.id}/").status_code, 403)


class ImportacaoCSVTests(Base):
    def _post(self, texto):
        f = BytesIO(texto.encode("utf-8"))
        f.name = "u.csv"
        return self.cli(self.coord).post("/api/usuarios/importar/", {"arquivo": f}, format="multipart")

    def test_importa_com_erros_parciais(self):
        csv = ("nome;usuario;papel;turma;senha\n"
               "Maria Silva;maria;aluno;6A;\n"
               "João Souza;maria;aluno;6A;abc12345\n"        # duplicado
               "Zé Ninguém;ze;aluno;9Z;\n"                   # turma inexistente
               "Prof Novo;pnovo;professor;;Senha-boa-1\n"
               "Xis;xis;alienigena;;\n")                      # papel inválido
        r = self._post(csv)
        self.assertEqual(r.status_code, 201)
        self.assertEqual({c["usuario"] for c in r.data["criados"]}, {"maria", "pnovo"})
        self.assertEqual(len(r.data["erros"]), 3)
        self.assertTrue(Matricula.objects.filter(aluno__username="maria", turma=self.turma).exists())
        maria = next(c for c in r.data["criados"] if c["usuario"] == "maria")
        self.assertTrue(len(maria["senha_temporaria"]) >= 8)
        self.assertEqual(Usuario.objects.get(username="maria").escola_id, self.esc.id)

    def test_colunas_obrigatorias(self):
        self.assertEqual(self._post("foo,bar\n1,2\n").status_code, 400)

    def test_so_coordenador(self):
        f = BytesIO(b"nome,usuario,papel\n"); f.name = "u.csv"
        self.assertEqual(self.cli(self.prof).post("/api/usuarios/importar/", {"arquivo": f}, format="multipart").status_code, 403)
