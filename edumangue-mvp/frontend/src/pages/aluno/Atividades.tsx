import { Link } from 'react-router-dom';
import { Badge, Empty, ErrorBox, PageHeader, Spinner } from '../../components/ui';
import { fmtDataHora, nota } from '../../lib/format';
import { TIPO_EMOJI, TIPO_LABEL, type TipoAtividade } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';

interface Item { id: number; titulo: string; tipo: TipoAtividade; prazo: string | null; disciplina: string; entregue: boolean; nota: number | null; atrasada: boolean }

export function AlunoAtividades() {
  const { data, loading, error, reload } = useFetch<Item[]>('aluno/atividades/');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const pend = data.filter((a) => !a.entregue);
  const feitas = data.filter((a) => a.entregue);

  const Linha = ({ a }: { a: Item }) => (
    <li>
      <Link to={`/aluno/atividades/${a.id}`} className="flex items-center gap-3 rounded-2xl border border-linha bg-white p-4 hover:border-mangue">
        <span className="text-3xl" aria-hidden>{TIPO_EMOJI[a.tipo]}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{a.titulo}</div>
          <div className="text-sm text-lama">{a.disciplina} · {TIPO_LABEL[a.tipo]}{a.prazo && !a.entregue ? ` · prazo ${fmtDataHora(a.prazo)}` : ''}</div>
        </div>
        {a.entregue ? <Badge tone="ok">Nota {nota(a.nota)}</Badge> : a.atrasada ? <Badge tone="bad">Atrasada</Badge> : <Badge tone="warn">Pendente</Badge>}
      </Link>
    </li>
  );

  return (
    <>
      <PageHeader title="Atividades" subtitle="Exercícios e jogos publicados pelos seus professores." />
      <h2 className="mb-3 text-lg font-bold">Pendentes ({pend.length})</h2>
      {pend.length === 0 ? <Empty>Nenhuma atividade pendente.</Empty> : <ul className="space-y-3">{pend.map((a) => <Linha key={a.id} a={a} />)}</ul>}
      <h2 className="mb-3 mt-8 text-lg font-bold">Concluídas ({feitas.length})</h2>
      {feitas.length === 0 ? <Empty>Você ainda não concluiu nenhuma.</Empty> : <ul className="space-y-3">{feitas.map((a) => <Linha key={a.id} a={a} />)}</ul>}
    </>
  );
}
