import { RefreshCcw } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-lama" role="status">
      <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-linha border-t-mangue" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-caranguejo/30 bg-caranguejo-light p-5 text-caranguejo" role="alert">
      <p className="font-semibold">Não foi possível carregar.</p>
      <p className="text-sm mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-caranguejo px-3 py-1.5 text-sm font-semibold text-white">
          <RefreshCcw className="h-4 w-4" /> Tentar de novo
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-lama">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-linha bg-white p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-linha px-4 py-6 text-center text-sm text-lama">{children}</p>;
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-mangue text-white hover:bg-mangue-dark',
  secondary: 'bg-white text-raiz border border-linha hover:bg-mare',
  danger: 'bg-caranguejo text-white hover:opacity-90',
  ghost: 'text-mangue hover:bg-mangue-light',
};

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'bad' }) {
  const t = { neutral: 'bg-mare text-lama', ok: 'bg-mangue-light text-mangue-dark', warn: 'bg-sol-light text-[#7A5A08]', bad: 'bg-caranguejo-light text-caranguejo' }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'bad' | 'ok' }) {
  return (
    <div className="rounded-2xl border border-linha bg-white p-4">
      <div className={`font-display text-3xl font-bold ${tone === 'bad' ? 'text-caranguejo' : tone === 'ok' ? 'text-mangue' : ''}`}>{value}</div>
      <div className="mt-1 text-sm text-lama">{label}</div>
    </div>
  );
}

export const inputCls =
  'w-full min-h-[44px] rounded-xl border border-linha bg-white px-3 py-2 text-raiz placeholder:text-lama/60 focus:border-mangue';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-lama">{hint}</span>}
    </label>
  );
}

export function FreqBar({ value, limite = 75 }: { value: number | null; limite?: number }) {
  if (value == null) return <span className="text-sm text-lama">sem registros</span>;
  const ruim = value < limite;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-mare" aria-hidden>
        <div className={`h-full ${ruim ? 'bg-caranguejo' : 'bg-mangue'}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className={`text-sm font-semibold ${ruim ? 'text-caranguejo' : ''}`}>{value.toFixed(0)}%</span>
    </div>
  );
}
