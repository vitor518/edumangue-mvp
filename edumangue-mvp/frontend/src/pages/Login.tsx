import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Field, inputCls } from '../components/ui';
import { ApiError } from '../lib/api';

export const HOME: Record<string, string> = { aluno: '/aluno', professor: '/professor', coordenador: '/coordenador' };

export function LoginPage() {
  const { usuario, login } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={HOME[usuario.papel]} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try { await login(u.trim(), p); }
    catch (err) {
      setErro(err instanceof ApiError && err.status === 401 ? 'Usuário ou senha incorretos.' : err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally { setEnviando(false); }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col justify-between bg-mangue-dark p-8 text-white md:p-12">
        <div className="font-display text-2xl font-bold">EduMangue</div>
        <div className="my-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">A chamada em um toque. A aula em um só lugar.</h1>
          <p className="mt-4 text-white/80">Atividades, agenda e frequência para alunos, professores e coordenação.</p>
        </div>
        <svg viewBox="0 0 400 60" className="w-full max-w-md text-white/25" aria-hidden>
          {[20, 70, 120, 170, 220, 270, 320, 370].map((x, i) => (
            <g key={x} stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d={`M${x} 10 v${20 + (i % 3) * 6}`} />
              <path d={`M${x} ${30 + (i % 3) * 6} q-14 12 -18 24 M${x} ${30 + (i % 3) * 6} q14 12 18 24`} />
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={enviar} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold">Entrar</h2>
          <Field label="Usuário">
            <input className={inputCls} value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" required />
          </Field>
          <Field label="Senha">
            <input className={inputCls} type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />
          </Field>
          {erro && <p className="rounded-lg bg-caranguejo-light px-3 py-2 text-sm text-caranguejo" role="alert">{erro}</p>}
          <Button type="submit" disabled={enviando} className="w-full">{enviando ? 'Entrando…' : 'Entrar'}</Button>
          {import.meta.env.DEV && (
            <p className="rounded-lg bg-sol-light p-3 text-xs text-lama">
              Demo: <b>coord</b>, <b>prof</b> ou <b>aluno</b> — senha <b>demo1234</b>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
