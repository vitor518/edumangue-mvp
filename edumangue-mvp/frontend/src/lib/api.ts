// Cliente HTTP com JWT. Access token em memória + localStorage (refresh também).
// Trade-off do MVP: localStorage é simples, mas exposto a XSS. Se endurecer, migrar refresh para cookie httpOnly.
const BASE = import.meta.env.VITE_API_URL ?? '';
const K_ACCESS = 'edu.access';
const K_REFRESH = 'edu.refresh';

export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;
  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const tokens = {
  get access() { return localStorage.getItem(K_ACCESS); },
  get refresh() { return localStorage.getItem(K_REFRESH); },
  set(access: string, refresh?: string) {
    localStorage.setItem(K_ACCESS, access);
    if (refresh) localStorage.setItem(K_REFRESH, refresh);
  },
  clear() { localStorage.removeItem(K_ACCESS); localStorage.removeItem(K_REFRESH); },
};

let onSessionExpired: () => void = () => {};
export const setSessionExpiredHandler = (fn: () => void) => { onSessionExpired = fn; };

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (!tokens.refresh) return false;
  refreshing ??= fetch(`${BASE}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const d = await r.json();
      tokens.set(d.access, d.refresh);
      return true;
    })
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

function parseError(status: number, body: any): ApiError {
  if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') return new ApiError(status, body.detail);
    if (Array.isArray(body)) return new ApiError(status, String(body[0]));
    const fields: Record<string, string[]> = {};
    let first = '';
    for (const [k, v] of Object.entries(body)) {
      const msgs = Array.isArray(v) ? v.map(String) : [typeof v === 'string' ? v : JSON.stringify(v)];
      fields[k] = msgs;
      if (!first) first = k === 'non_field_errors' ? msgs[0] : `${k}: ${msgs[0]}`;
    }
    return new ApiError(status, first || 'Erro na requisição', fields);
  }
  return new ApiError(status, 'Erro na requisição');
}

async function request<T>(method: string, path: string, body?: unknown, isForm = false, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method, headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet.');
  }

  if (res.status === 401 && retry && path !== '/auth/login/') {
    if (await tryRefresh()) return request<T>(method, path, body, isForm, false);
    tokens.clear();
    onSessionExpired();
    throw new ApiError(401, 'Sessão expirada. Entre novamente.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw parseError(res.status, data);
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', `/${p.replace(/^\//, '')}`),
  post: <T>(p: string, b?: unknown) => request<T>('POST', `/${p.replace(/^\//, '')}`, b ?? {}),
  put: <T>(p: string, b: unknown) => request<T>('PUT', `/${p.replace(/^\//, '')}`, b),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', `/${p.replace(/^\//, '')}`, b),
  del: <T = void>(p: string) => request<T>('DELETE', `/${p.replace(/^\//, '')}`),
  upload: <T>(p: string, form: FormData) => request<T>('POST', `/${p.replace(/^\//, '')}`, form, true),
};
