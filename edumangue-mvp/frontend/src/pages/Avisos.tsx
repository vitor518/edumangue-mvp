import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Card, Empty, ErrorBox, Field, PageHeader, Spinner, inputCls } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { fmtDataHora } from '../lib/format';
import type { Aviso } from '../lib/types';
import { useFetch } from '../lib/useFetch';

interface TurmaOpt { id: number; nome: string }

export function AvisosPage() {
  const { usuario } = useAuth();
  const podePublicar = usuario?.papel !== 'aluno';
  const { data, loading, error, reload } = useFetch<Aviso[]>('avisos/');
  const { data: turmas } = useFetch<TurmaOpt[]>(podePublicar ? (usuario!.papel === 'coordenador' ? 'turmas/' : 'alocacoes/') : null);
  const [form, setForm] = useState({ titulo: '', texto: '', turma: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Professor recebe alocações; extraímos turmas únicas
  const opcoes: TurmaOpt[] = (() => {
    if (!turmas) return [];
    if (usuario?.papel === 'coordenador') return turmas;
    const m = new Map<number, string>();
    (turmas as any[]).forEach((a) => m.set(a.turma, a.turma_nome));
    return [...m].map(([id, nome]) => ({ id, nome }));
  })();

  const publicar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(''); setSalvando(true);
    try {
      await api.post('avisos/', { titulo: form.titulo, texto: form.texto, turma: form.turma ? Number(form.turma) : null });
      setForm({ titulo: '', texto: '', turma: '' });
      reload();
    } catch (err) { setErro(err instanceof Error ? err.message : 'Erro'); }
    finally { setSalvando(false); }
  };

  const excluir = async (id: number) => {
    if (!confirm('Excluir este aviso?')) return;
    try { await api.del(`avisos/${id}/`); reload(); } catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
  };

  return (
    <>
      <PageHeader title="Avisos" />
      {podePublicar && (
        <Card className="mb-6">
          <form onSubmit={publicar} className="space-y-3">
            <h2 className="text-lg font-bold">Novo aviso</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Título"><input className={inputCls} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} maxLength={150} required /></Field>
              <Field label="Para">
                <select className={inputCls} value={form.turma} onChange={(e) => setForm({ ...form, turma: e.target.value })} required={usuario?.papel === 'professor'}>
                  {usuario?.papel === 'coordenador' ? <option value="">Toda a escola</option> : <option value="">Escolha a turma…</option>}
                  {opcoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Mensagem"><textarea className={inputCls} rows={3} value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} required /></Field>
            {erro && <p className="text-sm text-caranguejo" role="alert">{erro}</p>}
            <Button type="submit" disabled={salvando}>{salvando ? 'Publicando…' : 'Publicar'}</Button>
          </form>
        </Card>
      )}
      {loading ? <Spinner /> : error || !data ? <ErrorBox message={error ?? ''} onRetry={reload} /> : data.length === 0 ? <Empty>Nenhum aviso.</Empty> : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{a.titulo}</h3>
                    <p className="text-xs text-lama">{a.autor_nome} · {a.turma_nome ?? 'Toda a escola'} · {fmtDataHora(a.criado_em)}</p>
                  </div>
                  {podePublicar && (
                    <button onClick={() => excluir(a.id)} aria-label="Excluir aviso" className="rounded-lg p-2 text-lama hover:bg-caranguejo-light hover:text-caranguejo"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line">{a.texto}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
