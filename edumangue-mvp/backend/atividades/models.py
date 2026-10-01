from django.conf import settings
from django.db import models


class Atividade(models.Model):
    class Tipo(models.TextChoices):
        QUIZ = "quiz", "Quiz"
        MEMORIA = "memoria", "Jogo da memória"
        CONEXOES = "conexoes", "Jogo das conexões"

    alocacao = models.ForeignKey("academico.Alocacao", on_delete=models.CASCADE, related_name="atividades")
    titulo = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    # Estrutura depende do tipo (ver atividades/conteudo.py)
    conteudo = models.JSONField(default=dict)
    prazo = models.DateTimeField(null=True, blank=True)
    publicada = models.BooleanField(default=False)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criada_em"]
        verbose_name_plural = "atividades"

    def __str__(self):
        return self.titulo


class Entrega(models.Model):
    atividade = models.ForeignKey(Atividade, on_delete=models.CASCADE, related_name="entregas")
    aluno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="entregas")
    respostas = models.JSONField(default=dict)
    nota = models.DecimalField(max_digits=4, decimal_places=1)  # 0 a 10
    acertos = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    entregue_em = models.DateTimeField(auto_now_add=True)
    atrasada = models.BooleanField(default=False)

    class Meta:
        unique_together = [("atividade", "aluno")]
        verbose_name_plural = "entregas"
