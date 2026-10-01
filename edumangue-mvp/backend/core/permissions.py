from rest_framework.permissions import BasePermission

from .models import Papel


class _PapelPermission(BasePermission):
    papeis: tuple = ()

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.escola_id and u.papel in self.papeis)


class IsAluno(_PapelPermission):
    papeis = (Papel.ALUNO,)


class IsProfessor(_PapelPermission):
    papeis = (Papel.PROFESSOR,)


class IsCoordenador(_PapelPermission):
    papeis = (Papel.COORDENADOR,)


class IsProfessorOuCoordenador(_PapelPermission):
    papeis = (Papel.PROFESSOR, Papel.COORDENADOR)
