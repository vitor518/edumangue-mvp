import { BarChart2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Empty, ErrorBox, PageHeader, Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDataHora } from '../../lib/format';
import { TIPO_EMOJI, TIPO_LABEL, type TipoAtividade } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';

interface Item { id: number; titulo: string; tipo: TipoAtividade; publicada: boolean; prazo: string | null; turma_nome: string; disciplina_nome: string; total_entregas: number }

export function ProfessorAtividades() {
  const { data, loading, error, reload } = useFetch<Item[]>('atividades/');
  const excluir = async (a: Item) => {
    if (!confirm(`Excluir "${a.titulo}"? ${a.total_entregas ? `As ${a.total_entregas} entregas também serão apagadas.` : ''}`)) return;
    try { await api.del(`atividades/${a.id}/`); reload(); } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
  };
  const alternar = async (a: Item) => {
    try { await api.patch(`atividades/${a.id}/`, { publicada: !a.publicada }); reload(); } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
  };

  return (
    <>
      <PageHeader title="Atividades" subtitle="Crie exercícios e jogos e publique para suas turmas."
        action={<Link to="/professor/atividades/nova"><Button><Plus className="h-4 w-4" /> Nova atividade</Button></Link>} />
      {loading ? <Spinner /> : error || !data ? <ErrorBox message={error ?? ''} onRetry={reload} /> : data.length === 0 ? <Empty>Você ainda não criou atividades.</Empty> : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-linha bg-white p-4">
              <span className="text-3xl" aria-hidden>{TIPO_EMOJI[a.tipo]}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{a.titulo}</div>
                <div className="text-sm text-lama">{a.turma_nome} · {a.disciplina_nome} · {TIPO_LABEL[a.tipo]}{a.prazo ? ` · prazo ${fmtDataHora(a.prazo)}` : ''} · {a.total_entregas} entrega(s)</div>
              </div>
              <button onClick={() => alternar(a)} title="Clique para alterar"><Badge tone={a.publicada ? 'ok' : 'neutral'}>{a.publicada ? 'Publicada' : 'Rascunho'}</Badge></button>
              <div className="flex gap-1">
                <Link to={`/professor/atividades/${a.id}/resultados`} aria-label="Resultados" className="rounded-lg p-2 text-mangue hover:bg-mangue-light"><BarChart2 className="h-5 w-5" /></Link>
                <Link to={`/professor/atividades/${a.id}/editar`} aria-label="Editar" className="rounded-lg p-2 text-lama hover:bg-mare"><Pencil className="h-5 w-5" /></Link>
                <button onClick={() => excluir(a)} aria-label="Excluir" className="rounded-lg p-2 text-lama hover:bg-caranguejo-light hover:text-caranguejo"><Trash2 className="h-5 w-5" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
