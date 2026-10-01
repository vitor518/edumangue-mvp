export const fmtData = (iso?: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';

export const fmtDataHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const pct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(0)}%`);
export const nota = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1).replace('.', ','));

/** datetime-local ⇄ ISO */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
