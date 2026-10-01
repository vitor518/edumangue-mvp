import { BarChart3, BookOpen, CalendarDays, ClipboardCheck, Home, LogOut, Megaphone, Percent, School, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Papel } from '../lib/types';

interface Item { to: string; label: string; icon: ComponentType<{ className?: string }> }

const NAV: Record<Papel, Item[]> = {
  aluno: [
    { to: '/aluno', label: 'Início', icon: Home },
    { to: '/aluno/atividades', label: 'Atividades', icon: BookOpen },
    { to: '/aluno/frequencia', label: 'Frequência', icon: Percent },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays },
    { to: '/avisos', label: 'Avisos', icon: Megaphone },
  ],
  professor: [
    { to: '/professor', label: 'Início', icon: Home },
    { to: '/professor/chamada', label: 'Chamada', icon: ClipboardCheck },
    { to: '/professor/atividades', label: 'Atividades', icon: BookOpen },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays },
    { to: '/avisos', label: 'Avisos', icon: Megaphone },
  ],
  coordenador: [
    { to: '/coordenador', label: 'Painel', icon: BarChart3 },
    { to: '/coordenador/usuarios', label: 'Pessoas', icon: Users },
    { to: '/coordenador/estrutura', label: 'Turmas', icon: School },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays },
    { to: '/avisos', label: 'Avisos', icon: Megaphone },
  ],
};

const PAPEL_LABEL: Record<Papel, string> = { aluno: 'Aluno', professor: 'Professor', coordenador: 'Coordenação' };

export function Layout() {
  const { usuario, logout } = useAuth();
  if (!usuario) return null;
  const items = NAV[usuario.papel];
  const raiz = items[0].to;

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-white text-mangue-dark' : 'text-white/85 hover:bg-white/10'
    }`;

  return (
    <div className="min-h-screen md:flex">
      {/* Lateral (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-mangue-dark p-4 text-white md:flex">
        <div className="mb-8 px-2 pt-2">
          <div className="font-display text-2xl font-bold">EduMangue</div>
          <div className="mt-0.5 truncate text-xs text-white/70">{usuario.escola_nome}</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === raiz} className={linkCls}>
              <i.icon className="h-5 w-5" /> {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/15 pt-4">
          <div className="truncate px-2 text-sm font-semibold">{usuario.nome}</div>
          <div className="px-2 text-xs text-white/70">{PAPEL_LABEL[usuario.papel]}</div>
          <button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Topo (mobile) */}
      <header className="flex items-center justify-between bg-mangue-dark px-4 py-3 text-white md:hidden">
        <span className="font-display text-xl font-bold">EduMangue</span>
        <button onClick={logout} aria-label="Sair" className="rounded-lg p-2 hover:bg-white/10"><LogOut className="h-5 w-5" /></button>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 md:pb-10">
        <div className="mx-auto max-w-5xl"><Outlet /></div>
      </main>

      {/* Barra inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-linha bg-white md:hidden" aria-label="Principal">
        {items.map((i) => (
          <NavLink
            key={i.to} to={i.to} end={i.to === raiz}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? 'text-mangue' : 'text-lama'}`}
          >
            <i.icon className="h-5 w-5" /> {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
