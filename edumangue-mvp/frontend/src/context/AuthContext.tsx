import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setSessionExpiredHandler, tokens } from '../lib/api';
import type { Usuario } from '../lib/types';

interface Ctx {
  usuario: Usuario | null;
  carregando: boolean;
  login: (username: string, password: string) => Promise<Usuario>;
  logout: () => void;
}

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const logout = useCallback(() => { tokens.clear(); setUsuario(null); }, []);

  useEffect(() => {
    setSessionExpiredHandler(logout);
    if (!tokens.access) { setCarregando(false); return; }
    api.get<Usuario>('/auth/me/').then(setUsuario).catch(() => tokens.clear()).finally(() => setCarregando(false));
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const d = await api.post<{ access: string; refresh: string; usuario: Usuario }>('/auth/login/', { username, password });
    tokens.set(d.access, d.refresh);
    setUsuario(d.usuario);
    return d.usuario;
  }, []);

  const value = useMemo(() => ({ usuario, carregando, login, logout }), [usuario, carregando, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
