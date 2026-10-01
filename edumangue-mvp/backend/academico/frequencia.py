"""Cálculo de frequência. Falta justificada não conta como falta."""
from django.db.models import Count, Q

from .models import Presenca

LIMITE_RISCO = 75.0  # % mínimo de presença exigido (LDB: 75%)


def percentual(presentes: int, faltas: int, justificadas: int = 0) -> float | None:
    """Presença % considerando apenas aulas com registro. Justificadas saem do cálculo."""
    base = presentes + faltas
    if base == 0:
        return None
    return round(100 * presentes / base, 1)


def frequencia_por_aluno(presencas_qs):
    """Retorna {aluno_id: {presentes, faltas, justificadas, percentual}}."""
    rows = presencas_qs.values("aluno_id").annotate(
        p=Count("id", filter=Q(status=Presenca.Status.PRESENTE)),
        f=Count("id", filter=Q(status=Presenca.Status.FALTA)),
        j=Count("id", filter=Q(status=Presenca.Status.JUSTIFICADA)),
    )
    return {
        r["aluno_id"]: {
            "presentes": r["p"], "faltas": r["f"], "justificadas": r["j"],
            "percentual": percentual(r["p"], r["f"], r["j"]),
        }
        for r in rows
    }
