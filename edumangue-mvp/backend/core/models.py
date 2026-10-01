from django.contrib.auth.models import AbstractUser
from django.db import models


class Escola(models.Model):
    nome = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "escolas"

    def __str__(self):
        return self.nome


class Papel(models.TextChoices):
    ALUNO = "aluno", "Aluno"
    PROFESSOR = "professor", "Professor"
    COORDENADOR = "coordenador", "Coordenador"


class Usuario(AbstractUser):
    """Usuário único com papel. `escola` isola os dados entre instituições."""

    escola = models.ForeignKey(Escola, null=True, blank=True, on_delete=models.PROTECT, related_name="usuarios")
    papel = models.CharField(max_length=12, choices=Papel.choices, default=Papel.ALUNO)
    telefone = models.CharField(max_length=30, blank=True)
    # Aluno: nome do responsável (LGPD: consentimento de menores)
    responsavel = models.CharField(max_length=150, blank=True)
    consentimento_lgpd = models.BooleanField(default=False)

    class Meta:
        ordering = ["first_name", "last_name", "username"]

    @property
    def nome_completo(self):
        return self.get_full_name() or self.username

    def __str__(self):
        return f"{self.nome_completo} ({self.papel})"
