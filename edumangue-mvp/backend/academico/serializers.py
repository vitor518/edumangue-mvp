from rest_framework import serializers

from core.models import Papel, Usuario

from .models import Alocacao, Disciplina, Matricula, Turma


class DisciplinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disciplina
        fields = ["id", "nome"]

    def validate_nome(self, v):
        qs = Disciplina.objects.filter(escola=self.context["request"].user.escola, nome__iexact=v.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Disciplina já cadastrada.")
        return v.strip()


class TurmaSerializer(serializers.ModelSerializer):
    total_alunos = serializers.SerializerMethodField()

    class Meta:
        model = Turma
        fields = ["id", "nome", "ano_letivo", "total_alunos"]

    def get_total_alunos(self, obj):
        return obj.matriculas.filter(ativa=True).count()

    def validate(self, attrs):
        escola = self.context["request"].user.escola
        nome = attrs.get("nome", getattr(self.instance, "nome", None))
        ano = attrs.get("ano_letivo", getattr(self.instance, "ano_letivo", None))
        qs = Turma.objects.filter(escola=escola, nome__iexact=nome, ano_letivo=ano)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Turma já cadastrada neste ano letivo.")
        return attrs


class AlocacaoSerializer(serializers.ModelSerializer):
    turma_nome = serializers.CharField(source="turma.nome", read_only=True)
    disciplina_nome = serializers.CharField(source="disciplina.nome", read_only=True)
    professor_nome = serializers.CharField(source="professor.nome_completo", read_only=True)

    class Meta:
        model = Alocacao
        fields = ["id", "turma", "disciplina", "professor", "turma_nome", "disciplina_nome", "professor_nome"]

    def validate(self, attrs):
        escola = self.context["request"].user.escola
        turma = attrs.get("turma") or self.instance.turma
        disc = attrs.get("disciplina") or self.instance.disciplina
        prof = attrs.get("professor") or self.instance.professor
        if turma.escola_id != escola.id or disc.escola_id != escola.id or prof.escola_id != escola.id:
            raise serializers.ValidationError("Turma, disciplina e professor devem ser da sua escola.")
        if prof.papel != Papel.PROFESSOR:
            raise serializers.ValidationError({"professor": "O usuário informado não é professor."})
        qs = Alocacao.objects.filter(turma=turma, disciplina=disc, professor=prof)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Esta alocação já existe.")
        return attrs


class MatriculaSerializer(serializers.ModelSerializer):
    aluno_nome = serializers.CharField(source="aluno.nome_completo", read_only=True)
    turma_nome = serializers.CharField(source="turma.nome", read_only=True)

    class Meta:
        model = Matricula
        fields = ["id", "turma", "aluno", "ativa", "aluno_nome", "turma_nome"]

    def validate(self, attrs):
        escola = self.context["request"].user.escola
        turma = attrs.get("turma") or self.instance.turma
        aluno = attrs.get("aluno") or self.instance.aluno
        if turma.escola_id != escola.id or aluno.escola_id != escola.id:
            raise serializers.ValidationError("Aluno e turma devem ser da sua escola.")
        if aluno.papel != Papel.ALUNO:
            raise serializers.ValidationError({"aluno": "O usuário informado não é aluno."})
        qs = Matricula.objects.filter(turma=turma, aluno=aluno)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Aluno já matriculado nesta turma.")
        return attrs
