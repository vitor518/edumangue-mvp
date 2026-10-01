"""Validação, sanitização (o que o aluno pode ver) e correção de cada tipo.

Formatos de `conteudo`:
  quiz:     {"perguntas": [{"enunciado": str, "opcoes": [str, ...], "correta": int, "explicacao": str}]}
  memoria:  {"pares": [{"nome": str, "imagem": str}]}           # imagem = emoji/texto curto
  conexoes: {"pares": [{"esquerda": str, "direita": str}]}
"""
import random
from decimal import Decimal

from rest_framework import serializers

MAX_ITENS = 20


def _txt(v, campo, maximo=300, obrigatorio=True):
    if not isinstance(v, str):
        raise serializers.ValidationError(f"'{campo}' deve ser texto.")
    v = v.strip()
    if obrigatorio and not v:
        raise serializers.ValidationError(f"'{campo}' não pode ficar vazio.")
    if len(v) > maximo:
        raise serializers.ValidationError(f"'{campo}' excede {maximo} caracteres.")
    return v


def validar_conteudo(tipo: str, conteudo) -> dict:
    """Valida e devolve o conteúdo normalizado."""
    if not isinstance(conteudo, dict):
        raise serializers.ValidationError("Conteúdo inválido.")

    if tipo == "quiz":
        perguntas = conteudo.get("perguntas")
        if not isinstance(perguntas, list) or not 1 <= len(perguntas) <= MAX_ITENS:
            raise serializers.ValidationError(f"O quiz precisa de 1 a {MAX_ITENS} perguntas.")
        saida = []
        for i, p in enumerate(perguntas, 1):
            if not isinstance(p, dict):
                raise serializers.ValidationError(f"Pergunta {i} inválida.")
            opcoes = p.get("opcoes")
            if not isinstance(opcoes, list) or not 2 <= len(opcoes) <= 6:
                raise serializers.ValidationError(f"Pergunta {i}: use de 2 a 6 opções.")
            opcoes = [_txt(o, f"opção da pergunta {i}") for o in opcoes]
            correta = p.get("correta")
            if not isinstance(correta, int) or isinstance(correta, bool) or not 0 <= correta < len(opcoes):
                raise serializers.ValidationError(f"Pergunta {i}: marque a opção correta.")
            saida.append({
                "enunciado": _txt(p.get("enunciado"), f"enunciado {i}", 500),
                "opcoes": opcoes,
                "correta": correta,
                "explicacao": _txt(p.get("explicacao", ""), f"explicação {i}", 500, obrigatorio=False),
            })
        return {"perguntas": saida}

    if tipo == "memoria":
        pares = conteudo.get("pares")
        if not isinstance(pares, list) or not 2 <= len(pares) <= 12:
            raise serializers.ValidationError("A memória precisa de 2 a 12 pares.")
        return {"pares": [
            {"nome": _txt(p.get("nome") if isinstance(p, dict) else None, "nome", 60),
             "imagem": _txt(p.get("imagem", "") if isinstance(p, dict) else "", "imagem", 16, obrigatorio=False)}
            for p in pares
        ]}

    if tipo == "conexoes":
        pares = conteudo.get("pares")
        if not isinstance(pares, list) or not 2 <= len(pares) <= 10:
            raise serializers.ValidationError("As conexões precisam de 2 a 10 pares.")
        saida = [
            {"esquerda": _txt(p.get("esquerda") if isinstance(p, dict) else None, "esquerda", 120),
             "direita": _txt(p.get("direita") if isinstance(p, dict) else None, "direita", 200)}
            for p in pares
        ]
        if len({p["direita"] for p in saida}) != len(saida) or len({p["esquerda"] for p in saida}) != len(saida):
            raise serializers.ValidationError("Não repita itens nas conexões.")
        return {"pares": saida}

    raise serializers.ValidationError("Tipo de atividade inválido.")


def conteudo_para_aluno(tipo: str, conteudo: dict) -> dict:
    """Remove gabarito. Conexões: as colunas vão embaralhadas de forma independente."""
    if tipo == "quiz":
        return {"perguntas": [{"enunciado": p["enunciado"], "opcoes": p["opcoes"]} for p in conteudo["perguntas"]]}
    if tipo == "memoria":
        return conteudo
    if tipo == "conexoes":
        esq = [p["esquerda"] for p in conteudo["pares"]]
        dire = [p["direita"] for p in conteudo["pares"]]
        random.shuffle(esq)
        random.shuffle(dire)
        return {"esquerda": esq, "direita": dire}
    return {}


def _nota(acertos: int, total: int) -> Decimal:
    if total == 0:
        return Decimal("0.0")
    return (Decimal(10) * acertos / total).quantize(Decimal("0.1"))


def corrigir(tipo: str, conteudo: dict, respostas) -> dict:
    """Devolve {acertos, total, nota, feedback}. Levanta ValidationError se a resposta for malformada."""
    if not isinstance(respostas, dict):
        raise serializers.ValidationError("Respostas inválidas.")

    if tipo == "quiz":
        perguntas = conteudo["perguntas"]
        marcadas = respostas.get("respostas")
        if not isinstance(marcadas, list) or len(marcadas) != len(perguntas):
            raise serializers.ValidationError("Responda todas as perguntas.")
        feedback, acertos = [], 0
        for p, m in zip(perguntas, marcadas):
            if not isinstance(m, int) or isinstance(m, bool) or not 0 <= m < len(p["opcoes"]):
                raise serializers.ValidationError("Resposta inválida.")
            ok = m == p["correta"]
            acertos += ok
            feedback.append({"correta": p["correta"], "marcada": m, "acertou": ok, "explicacao": p["explicacao"]})
        return {"acertos": acertos, "total": len(perguntas), "nota": _nota(acertos, len(perguntas)), "feedback": feedback}

    if tipo == "conexoes":
        gabarito = {p["esquerda"]: p["direita"] for p in conteudo["pares"]}
        ligacoes = respostas.get("ligacoes")
        if not isinstance(ligacoes, dict) or not ligacoes:
            raise serializers.ValidationError("Faça as ligações antes de enviar.")
        acertos = sum(1 for e, d in ligacoes.items() if gabarito.get(e) == d)
        return {
            "acertos": acertos, "total": len(gabarito), "nota": _nota(acertos, len(gabarito)),
            "feedback": [{"esquerda": e, "direita": d, "acertou": gabarito.get(e) == d, "correta": gabarito.get(e)}
                         for e, d in ligacoes.items() if e in gabarito],
        }

    if tipo == "memoria":
        # A memória é jogada no navegador; o servidor calcula a nota a partir das
        # tentativas informadas (eficiência = pares / tentativas). Baixo risco: é jogo.
        n = len(conteudo["pares"])
        tentativas, tempo = respostas.get("tentativas"), respostas.get("tempo", 0)
        if not isinstance(tentativas, int) or isinstance(tentativas, bool) or tentativas < n or tentativas > 500:
            raise serializers.ValidationError("Resultado inválido.")
        if not isinstance(tempo, int) or isinstance(tempo, bool) or tempo < 0:
            raise serializers.ValidationError("Resultado inválido.")
        nota = _nota(n, tentativas)  # perfeito = 10
        return {"acertos": n, "total": n, "nota": nota, "feedback": {"tentativas": tentativas, "tempo": tempo}}

    raise serializers.ValidationError("Tipo inválido.")
