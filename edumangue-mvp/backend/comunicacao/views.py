from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied

from academico import selectors
from core.models import Papel
from core.permissions import IsProfessorOuCoordenador  # noqa: F401

from .models import Aviso, Evento


class _EscopoSerializer(serializers.ModelSerializer):
    turma_nome = serializers.CharField(source="turma.nome", read_only=True, default=None)
    autor_nome = serializers.CharField(source="autor.nome_completo", read_only=True)

    def validate(self, attrs):
        # validate() (e não validate_turma) porque campos omitidos não passam por validate_<campo>.
        turma = attrs.get("turma", self.instance.turma if self.instance else None)
        user = self.context["request"].user
        if turma is None:
            if user.papel != Papel.COORDENADOR:
                raise serializers.ValidationError({"turma": "Apenas o coordenador publica para toda a escola."})
            return attrs
        if turma.escola_id != user.escola_id:
            raise serializers.ValidationError({"turma": "Turma inválida."})
        if user.papel == Papel.PROFESSOR and not selectors.turmas_do_professor(user).filter(pk=turma.pk).exists():
            raise serializers.ValidationError({"turma": "Você não leciona nesta turma."})
        return attrs


class AvisoSerializer(_EscopoSerializer):
    class Meta:
        model = Aviso
        fields = ["id", "turma", "turma_nome", "autor_nome", "titulo", "texto", "criado_em"]
        read_only_fields = ["criado_em"]
        extra_kwargs = {"turma": {"required": False, "allow_null": True}}


class EventoSerializer(_EscopoSerializer):
    class Meta:
        model = Evento
        fields = ["id", "turma", "turma_nome", "autor_nome", "titulo", "descricao", "tipo", "data"]
        extra_kwargs = {"turma": {"required": False, "allow_null": True}}


class _Base(viewsets.ModelViewSet):
    """Leitura: qualquer papel vê o que é da escola inteira ou das suas turmas.
    Escrita: professor/coordenador; só o autor edita/exclui (coordenador exclui qualquer um)."""

    model = None

    def _turmas_visiveis(self):
        u = self.request.user
        if u.papel == Papel.ALUNO:
            return selectors.turmas_do_aluno(u)
        if u.papel == Papel.PROFESSOR:
            return selectors.turmas_do_professor(u)
        return None  # coordenador vê tudo

    def get_queryset(self):
        u = self.request.user
        qs = self.model.objects.filter(escola=u.escola).select_related("turma", "autor")
        turmas = self._turmas_visiveis()
        if turmas is not None:
            qs = qs.filter(Q(turma__isnull=True) | Q(turma__in=turmas))
        return qs

    def _checar_escrita(self):
        if self.request.user.papel == Papel.ALUNO:
            raise PermissionDenied("Alunos não podem publicar.")

    def perform_create(self, serializer):
        self._checar_escrita()
        u = self.request.user
        serializer.save(escola=u.escola, autor=u)

    def _checar_dono(self, obj):
        u = self.request.user
        if u.papel == Papel.ALUNO or (u.papel == Papel.PROFESSOR and obj.autor_id != u.id):
            raise PermissionDenied("Você não pode alterar este item.")

    def perform_update(self, serializer):
        self._checar_dono(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._checar_dono(instance)
        instance.delete()


class AvisoViewSet(_Base):
    model = Aviso
    serializer_class = AvisoSerializer


class EventoViewSet(_Base):
    model = Evento
    serializer_class = EventoSerializer
