import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try { setData(await api.get<T>(path)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro inesperado'); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load, setData };
}
