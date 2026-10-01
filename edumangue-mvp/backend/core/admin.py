from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Escola, Usuario


@admin.register(Escola)
class EscolaAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug")
    prepopulated_fields = {"slug": ("nome",)}


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ("username", "nome_completo", "papel", "escola", "is_active")
    list_filter = ("papel", "escola", "is_active")
    fieldsets = UserAdmin.fieldsets + (("EduMangue", {"fields": ("escola", "papel", "telefone", "responsavel", "consentimento_lgpd")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("EduMangue", {"fields": ("escola", "papel")}),)
