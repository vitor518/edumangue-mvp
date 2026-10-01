# EduMangue — MVP EdTech

Plataforma de apoio ao estudo + portal escolar com três perfis: **aluno**, **professor** e **coordenador**.
Evolução do projeto "Mundo dos Mangues": os jogos (memória, conexões, quiz) agora são **tipos de atividade genéricos**,
criados pelos professores. O conteúdo dos mangues virou o pacote de demonstração.

**Stack:** Django 5 + Django REST Framework + JWT (SimpleJWT) · React 18 + TypeScript + Tailwind + Vite · SQLite (dev) / PostgreSQL (prod).

## Rodando localmente

```bash
# Backend (terminal 1)
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo          # escola demo com dados de exemplo
python manage.py runserver          # http://localhost:8000

# Frontend (terminal 2)
cd frontend
npm install
npm run dev                         # http://localhost:5000  (proxy /api → :8000)
```

Logins da demo (senha **demo1234**): `coord` (coordenador), `prof` e `prof2` (professores), `aluno`, `aluno1`…`aluno7` (alunos).
Painel administrativo do Django em `/admin/` (crie um superusuário com `python manage.py createsuperuser`; associe-o a uma escola).

Testes: `cd backend && python manage.py test` (38 testes: permissões por papel, isolamento entre escolas, correção, chamada, CSV).

## O que cada perfil faz

| Perfil | Funcionalidades |
|---|---|
| **Aluno** | Painel (pendências, média, frequência, avisos, agenda) · fazer atividades (quiz, memória, conexões) com nota e feedback · ver frequência por disciplina |
| **Professor** | **Chamada rápida** (todos começam presentes; toca em quem faltou; P/F/J; salva em uma ação) · criar/editar/publicar atividades · resultados por aluno · agenda e avisos por turma |
| **Coordenador** | Cadastro de pessoas + **importação CSV** · turmas, disciplinas, alocação de professores, matrículas · dashboard: frequência por turma, **alunos abaixo de 75%**, taxa de entrega de atividades · avisos e eventos da escola toda |

## Modelo de dados

`Escola` → `Usuario(papel)` · `Turma` · `Disciplina` · `Alocacao(turma+disciplina+professor)` · `Matricula(turma+aluno)` ·
`Aula(alocacao+data)` → `Presenca(aluno, P/F/J)` · `Atividade(alocacao, tipo, conteudo JSON)` → `Entrega(aluno, nota)` · `Aviso` · `Evento`.

A **Alocação** é o eixo: chamadas e atividades pertencem a ela (o professor X dando a disciplina Y para a turma Z).

## Decisões importantes

- **Multi-escola desde o início:** toda consulta é filtrada por `request.user.escola`; a escola de um novo registro vem sempre do usuário logado, nunca do corpo da requisição (testado).
- **Gabarito nunca vai ao aluno.** Quiz e conexões são corrigidos no servidor; o aluno só recebe as perguntas/colunas (embaralhadas). A resposta certa aparece apenas depois da entrega.
- **Uma entrega por aluno/atividade** (restrição no banco). O conteúdo trava depois da primeira entrega, para não invalidar notas.
- **Frequência:** falta justificada não conta como falta; o risco só é sinalizado com ≥ 3 aulas registradas; limite de 75% em `academico/frequencia.py`.
- **Usuários não são apagados**, só desativados (preserva histórico de notas e presença).
- Login limitado a 10 tentativas/min; access token de 30 min com refresh de 7 dias.

## Limitações conhecidas do MVP (decisões conscientes)

1. **Memória é jogada no navegador:** a nota vem do nº de tentativas informado pelo cliente. Um aluno técnico poderia forjar. Aceitável para jogo; se a nota for oficial, use apenas quiz/conexões.
2. **Tokens em `localStorage`** (simples, mas exposto a XSS). Para endurecer: refresh token em cookie httpOnly.
3. **Sem recuperação de senha por e-mail** — o coordenador redefine pelo admin/cadastro. Próximo passo natural.
4. **Sem modo offline** para a chamada (dor real em escolas com internet ruim → PWA + fila local).
5. **Sem boletim oficial, financeiro, chat, notificações push.**
6. `docker-compose.yml` e Dockerfiles foram escritos mas **não foram testados** neste ambiente.

## LGPD (atenção antes do piloto)

Há dados de menores. O modelo já tem `responsavel` e `consentimento_lgpd`, mas **o fluxo de coleta do consentimento não está implementado**.
Defina base legal, política de privacidade, retenção e quem acessa o quê antes de usar com alunos reais.

## Produção

`docker compose up --build` (veja `.env.docker.example`), ou hospede separadamente: backend em qualquer PaaS com Postgres
(`DATABASE_URL`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_DEBUG=0`) e frontend estático (`npm run build`) com `/api` roteado ao backend.

## API (resumo)

`POST /api/auth/login/` · `GET /api/auth/me/` · `POST /api/auth/senha/`
Coordenador: `/api/usuarios/` (+`importar/`), `/turmas/`, `/disciplinas/`, `/alocacoes/`, `/matriculas/`, `/coordenador/dashboard/`
Professor: `/professor/painel/`, `/alocacoes/{id}/chamada/` (GET/PUT), `/alocacoes/{id}/frequencia/`, `/atividades/`, `/atividades/{id}/resultados/`
Aluno: `/aluno/painel/`, `/aluno/atividades/`, `/aluno/atividades/{id}/` e `/entregar/`, `/aluno/frequencia/`
Todos: `/avisos/`, `/eventos/` (leitura filtrada por turma; escrita só professor/coordenador)
