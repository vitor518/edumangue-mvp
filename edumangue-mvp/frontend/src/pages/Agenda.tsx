import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, Empty, ErrorBox, Field, PageHeader, Spinner, inputCls } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { fmtData, hojeISO } from '../lib/format';
import type { Evento } from '../lib/types';
import { useFetch } from '../lib/useFetch';

const TIPOS = [['prova', 'Prova'], ['entrega', 'Entrega'], ['evento', 'Evento'], ['reuniao', 'Reunião']];
const TONE: Record<string, 'bad' | 'warn' | 'ok' | 'neutral'> = { prova: 'bad', entrega: 'warn', evento: 'ok', reuniao: 'neutral' };

export function AgendaPage() {
  const { usuario } = useAuth();
  const podeCriar = usuario?.papel !== 'aluno';
  const { data, loading, error, reload } = useFetch<Evento[]>('eventos/');
  const { data: aloc } = useFetch<any[]>(usuario?.papel === 'professor' ? 'alocacoes/' : null);
  const { data: turmasCoord } = useFetch<any[]>(usuario?.papel === 'coordenador' ? 'turmas/' : null);
  const [f, setF] = useState({ titulo: '', tipo: 'prova', data: hojeISO(), turma: '' });
  const [erro, setErro] = useState('');

  const turmas: { id: number; nome: string }[] = usuario?.papel === 'coordenador'
    ? (turmasCoord ?? [])
    : [...new Map((aloc ?? []).map((a) => [a.turma, a.turma_nome])).entries()].map(([id, nome]) => ({ id, nome }));

  const criar = async (e: FormEvent) => {
    e.preventDefault(); setErro('');
    try {
      await api.post('eventos/', { titulo: f.titulo, tipo: f.tipo, data: f.data, turma: f.turma ? Number(f.turma) : null });
      setF({ ...f, titulo: '' }); reload();
    } catch (err) { setErro(err instanceof Error ? err.message : 'Erro'); }
  };
  const excluir = async (id: number) => {
    if (!confirm('Excluir este evento?')) return;
    try { await api.del(`eventos/${id}/`); reload(); } catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
  };

  const hoje = hojeISO();
  const futuros = (data ?? []).filter((e) => e.data >= hoje);
  const passados = (data ?? []).filter((e) => e.data < hoje).reverse();

  const Lista = ({ itens }: { itens: Evento[] }) => (
    <ul className="space-y-2">
      {itens.map((e) => (
        <li key={e.id} className="flex items-center gap-4 rounded-2xl border border-linha bg-white p-4">
          <div className="w-16 shrink-0 text-center font-display text-lg font-bold text-mangue">{fmtData(e.data)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{e.titulo}</div>
            <div className="text-sm text-lama">{e.turma_nome ?? 'Toda a escola'}</div>
          </div>
          <Badge tone={TONE[e.tipo]}>{TIPOS.find((t) => t[0] === e.tipo)?.[1]}</Badge>
          {podeCriar && <button onClick={() => excluir(e.id)} aria-label="Excluir evento" className="rounded-lg p-2 text-lama hover:bg-caranguejo-light hover:text-caranguejo"><Trash2 className="h-4 w-4" /></button>}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader title="Agenda" subtitle="Provas, entregas e eventos." />
      {podeCriar && (
        <Card className="mb-6">
          <form onSubmit={criar} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="lg:col-span-2"><Field label="Título"><input className={inputCls} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required maxLength={150} /></Field></div>
            <Field label="Tipo"><select className={inputCls} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required /></Field>
            <Field label="Turma">
              <select className={inputCls} value={f.turma} onChange={(e) => setF({ ...f, turma: e.target.value })} required={usuario?.papel === 'professor'}>
                <option value="">{usuario?.papel === 'coordenador' ? 'Toda a escola' : 'Escolha…'}</option>
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-5"><Button type="submit">Adicionar à agenda</Button>{erro && <span className="ml-3 text-sm text-caranguejo" role="alert">{erro}</span>}</div>
          </form>
        </Card>
      )}
      {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <>
          <h2 className="mb-3 text-lg font-bold">Próximos</h2>
          {futuros.length === 0 ? <Empty>Nada agendado.</Empty> : <Lista itens={futuros} />}
          {passados.length > 0 && (<><h2 className="mb-3 mt-8 text-lg font-bold text-lama">Anteriores</h2><Lista itens={passados.slice(0, 10)} /></>)}
        </>
      )}
    </>
  );
}
