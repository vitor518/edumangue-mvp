from rest_framework import serializers

from .conteudo import validar_conteudo
from .models import Atividade


class AtividadeSerializer(serializers.ModelSerializer):
    """Visão do professor (inclui gabarito)."""

    turma_nome = serializers.CharField(source="alocacao.turma.nome", read_only=True)
    disciplina_nome = serializers.CharField(source="alocacao.disciplina.nome", read_only=True)
    total_entregas = serializers.SerializerMethodField()

    class Meta:
        model = Atividade
        fields = ["id", "alocacao", "titulo", "descricao", "tipo", "conteudo", "prazo", "publicada",
                  "criada_em", "turma_nome", "disciplina_nome", "total_entregas"]
        read_only_fields = ["criada_em"]

    def get_total_entregas(self, obj):
        return obj.entregas.count()

    def validate_alocacao(self, aloc):
        user = self.context["request"].user
        if aloc.professor_id != user.id or aloc.turma.escola_id != user.escola_id:
            raise serializers.ValidationError("Você não leciona nesta turma/disciplina.")
        return aloc

    def validate(self, attrs):
        tipo = attrs.get("tipo", getattr(self.instance, "tipo", None))
        conteudo = attrs.get("conteudo", getattr(self.instance, "conteudo", None))
        if self.instance and self.instance.entregas.exists():
            if "conteudo" in attrs or "tipo" in attrs or "alocacao" in attrs:
                raise serializers.ValidationError(
                    "Esta atividade já recebeu entregas; o conteúdo não pode mais ser alterado.")
        if "conteudo" in attrs or "tipo" in attrs:
            attrs["conteudo"] = validar_conteudo(tipo, conteudo)
        return attrs
