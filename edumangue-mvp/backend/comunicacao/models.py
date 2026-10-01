from django.conf import settings
from django.db import models


class Aviso(models.Model):
    escola = models.ForeignKey("core.Escola", on_delete=models.CASCADE, related_name="avisos")
    turma = models.ForeignKey("academico.Turma", null=True, blank=True, on_delete=models.CASCADE,
                              related_name="avisos", help_text="Vazio = toda a escola")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="avisos")
    titulo = models.CharField(max_length=150)
    texto = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]


class Evento(models.Model):
    class Tipo(models.TextChoices):
        PROVA = "prova", "Prova"
        ENTREGA = "entrega", "Entrega"
        EVENTO = "evento", "Evento"
        REUNIAO = "reuniao", "Reunião"

    escola = models.ForeignKey("core.Escola", on_delete=models.CASCADE, related_name="eventos")
    turma = models.ForeignKey("academico.Turma", null=True, blank=True, on_delete=models.CASCADE,
                              related_name="eventos", help_text="Vazio = toda a escola")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="eventos")
    titulo = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    tipo = models.CharField(max_length=10, choices=Tipo.choices, default=Tipo.EVENTO)
    data = models.DateField()

    class Meta:
        ordering = ["data"]
