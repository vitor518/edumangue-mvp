import { Check, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Empty, ErrorBox, Field, PageHeader, Spinner, inputCls } from '../../components/ui';
import { api } from '../../lib/api';
import { useFetch } from '../../lib/useFetch';

type St = 'P' | 'F' | 'J';
interface Aloc { id: number; turma_nome: string; disciplina_nome: string }
interface Chamada { data: string; tema: string; registrada: boolean; alunos: { id: number; nome: string; status: St }[] }

const BTN: Record<St, { label: string; on: string }> = {
  P: { label: 'P', on: 'bg-mangue text-white border-mangue' },
  F: { label: 'F', on: 'bg-caranguejo text-white border-caranguejo' },
  J: { label: 'J', on: 'bg-sol text-raiz border-sol' },
};

export function ChamadaPage() {
  const { alocacao } = useParams();
  const nav = useNavigate();
  const { data: alocs, loading: la, error: ea } = useFetch<Aloc[]>('alocacoes/');
  // Sem data escolhida, o servidor responde com "hoje" no fuso da escola (evita divergência com o relógio do aparelho).
  const [diaSel, setDiaSel] = useState('');
  const [hoje, setHoje] = useState('');
  const path = alocacao ? `alocacoes/${alocacao}/chamada/${diaSel ? `?data=${diaSel}` : ''}` : null;
  const { data, loading, error, reload } = useFetch<Chamada>(path);
  const dia = diaSel || data?.data || '';
  const [status, setStatus] = useState<Record<number, St>>({});
  const [tema, setTema] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    if (!diaSel) setHoje(data.data);
    setStatus(Object.fromEntries(data.alunos.map((a) => [a.id, a.status])));
    setTema(data.tema);
    setMsg(null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const cont = useMemo(() => {
    const c = { P: 0, F: 0, J: 0 };
    Object.values(status).forEach((s) => c[s]++);
    return c;
  }, [status]);

  const salvar = async () => {
    setSalvando(true); setMsg(null);
    try {
      await api.put(`alocacoes/${alocacao}/chamada/`, {
        data: dia, tema, presencas: Object.entries(status).map(([aluno, st]) => ({ aluno: Number(aluno), status: st })),
      });
      setMsg({ ok: true, texto: 'Chamada salva.' });
    } catch (e) { setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Erro ao salvar.' }); }
    finally { setSalvando(false); }
  };

  if (la) return <Spinner />;
  if (ea) return <ErrorBox message={ea} />;

  return (
    <>
      <PageHeader title="Chamada" subtitle="Todos começam presentes. Toque em quem faltou." />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Turma / disciplina">
          <select className={inputCls} value={alocacao ?? ''} onChange={(e) => nav(`/professor/chamada/${e.target.value}`)}>
            <option value="" disabled>Escolha…</option>
            {alocs?.map((a) => <option key={a.id} value={a.id}>{a.turma_nome} · {a.disciplina_nome}</option>)}
          </select>
        </Field>
        <Field label="Data"><input type="date" className={inputCls} value={dia} max={hoje || undefined} onChange={(e) => setDiaSel(e.target.value === hoje ? '' : e.target.value)} /></Field>
      </div>

      {!alocacao ? <Empty>Escolha uma turma para começar.</Empty> : loading ? <Spinner /> : error || !data ? <ErrorBox message={error ?? ''} onRetry={reload} /> : (
        <>
          <Card className="mb-4">
            <Field label="Tema da aula (opcional)"><input className={inputCls} value={tema} onChange={(e) => setTema(e.target.value)} maxLength={200} /></Field>
            {data.registrada && <p className="mt-3 text-sm text-lama">Já existe chamada nesta data. Ao salvar, ela será atualizada.</p>}
          </Card>

          <ul className="mb-24 divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-white">
            {data.alunos.length === 0 && <li className="p-6"><Empty>Turma sem alunos matriculados.</Empty></li>}
            {data.alunos.map((a) => {
              const s = status[a.id] ?? 'P';
              return (
                <li key={a.id} className={`flex items-center gap-3 px-4 py-2 ${s === 'F' ? 'bg-caranguejo-light/50' : ''}`}>
                  <button className="min-h-[44px] flex-1 text-left font-semibold" onClick={() => setStatus({ ...status, [a.id]: s === 'F' ? 'P' : 'F' })}>
                    {a.nome}
                  </button>
                  <div className="flex gap-1" role="group" aria-label={`Presença de ${a.nome}`}>
                    {(Object.keys(BTN) as St[]).map((k) => (
                      <button
                        key={k} aria-pressed={s === k} aria-label={{ P: 'Presente', F: 'Falta', J: 'Falta justificada' }[k]}
                        onClick={() => setStatus({ ...status, [a.id]: k })}
                        className={`h-11 w-11 rounded-xl border-2 text-sm font-bold ${s === k ? BTN[k].on : 'border-linha bg-white text-lama'}`}
                      >{BTN[k].label}</button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="fixed inset-x-0 bottom-14 z-10 border-t border-linha bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <div className="text-sm font-semibold">
                <span className="text-mangue">{cont.P} presentes</span> · <span className="text-caranguejo">{cont.F} faltas</span> · {cont.J} just.
                {msg && <span className={`ml-3 inline-flex items-center gap-1 ${msg.ok ? 'text-mangue' : 'text-caranguejo'}`} role="status">{msg.ok && <Check className="h-4 w-4" />}{msg.texto}</span>}
              </div>
              <Button onClick={salvar} disabled={salvando || data.alunos.length === 0}><Save className="h-4 w-4" />{salvando ? 'Salvando…' : 'Salvar chamada'}</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
