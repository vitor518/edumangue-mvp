from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Papel, Usuario


class UsuarioResumoSerializer(serializers.ModelSerializer):
    nome = serializers.CharField(source="nome_completo", read_only=True)
    escola_nome = serializers.CharField(source="escola.nome", read_only=True)

    class Meta:
        model = Usuario
        fields = ["id", "username", "nome", "email", "papel", "escola_nome"]


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.escola_id:
            raise serializers.ValidationError("Usuário sem escola vinculada.")
        data["usuario"] = UsuarioResumoSerializer(self.user).data
        return data


class UsuarioSerializer(serializers.ModelSerializer):
    """CRUD do coordenador. A senha é write-only."""

    nome = serializers.CharField(source="nome_completo", read_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "first_name", "last_name", "nome", "email", "papel",
            "telefone", "responsavel", "consentimento_lgpd", "is_active", "password",
        ]

    def validate_papel(self, v):
        if v not in Papel.values:
            raise serializers.ValidationError("Papel inválido.")
        return v

    def validate_password(self, v):
        validate_password(v)
        return v

    def validate_username(self, v):
        qs = Usuario.objects.filter(username__iexact=v)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Já existe um usuário com este login.")
        return v

    def create(self, validated):
        senha = validated.pop("password", None)
        if not senha:
            raise serializers.ValidationError({"password": "Informe uma senha."})
        user = Usuario(**validated, escola=self.context["request"].user.escola)
        user.set_password(senha)
        user.save()
        return user

    def update(self, instance, validated):
        senha = validated.pop("password", None)
        for k, v in validated.items():
            setattr(instance, k, v)
        if senha:
            instance.set_password(senha)
        instance.save()
        return instance


class TrocarSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField()
    nova_senha = serializers.CharField()

    def validate_nova_senha(self, v):
        validate_password(v)
        return v
