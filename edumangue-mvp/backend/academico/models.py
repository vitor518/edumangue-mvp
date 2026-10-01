from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Disciplina(models.Model):
    escola = models.ForeignKey("core.Escola", on_delete=models.CASCADE, related_name="disciplinas")
    nome = models.CharField(max_length=100)

    class Meta:
        unique_together = [("escola", "nome")]
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Turma(models.Model):
    escola = models.ForeignKey("core.Escola", on_delete=models.CASCADE, related_name="turmas")
    nome = models.CharField(max_length=80)  # ex.: "6º A"
    ano_letivo = models.PositiveSmallIntegerField(default=2026)

    class Meta:
        unique_together = [("escola", "nome", "ano_letivo")]
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.ano_letivo})"


class Alocacao(models.Model):
    """Professor + disciplina + turma. É a 'aula' recorrente sobre a qual
    ocorrem chamadas e atividades."""

    turma = models.ForeignKey(Turma, on_delete=models.CASCADE, related_name="alocacoes")
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE, related_name="alocacoes")
    professor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alocacoes")

    class Meta:
        unique_together = [("turma", "disciplina", "professor")]
        verbose_name_plural = "alocações"

    def clean(self):
        escolas = {self.turma.escola_id, self.disciplina.escola_id, self.professor.escola_id}
        if len(escolas) != 1:
            raise ValidationError("Turma, disciplina e professor devem ser da mesma escola.")
        if self.professor.papel != "professor":
            raise ValidationError("O usuário informado não é professor.")

    @property
    def escola_id(self):
        return self.turma.escola_id

    def __str__(self):
        return f"{self.disciplina} - {self.turma} ({self.professor.nome_completo})"


class Matricula(models.Model):
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE, related_name="matriculas")
    aluno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="matriculas")
    ativa = models.BooleanField(default=True)

    class Meta:
        unique_together = [("turma", "aluno")]

    def clean(self):
        if self.aluno.papel != "aluno":
            raise ValidationError("O usuário informado não é aluno.")
        if self.aluno.escola_id != self.turma.escola_id:
            raise ValidationError("Aluno e turma devem ser da mesma escola.")

    def __str__(self):
        return f"{self.aluno.nome_completo} em {self.turma}"


class Aula(models.Model):
    alocacao = models.ForeignKey(Alocacao, on_delete=models.CASCADE, related_name="aulas")
    data = models.DateField()
    tema = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = [("alocacao", "data")]
        ordering = ["-data"]

    def __str__(self):
        return f"{self.alocacao} - {self.data}"


class Presenca(models.Model):
    class Status(models.TextChoices):
        PRESENTE = "P", "Presente"
        FALTA = "F", "Falta"
        JUSTIFICADA = "J", "Falta justificada"

    aula = models.ForeignKey(Aula, on_delete=models.CASCADE, related_name="presencas")
    aluno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="presencas")
    status = models.CharField(max_length=1, choices=Status.choices, default=Status.PRESENTE)

    class Meta:
        unique_together = [("aula", "aluno")]
        verbose_name_plural = "presenças"
