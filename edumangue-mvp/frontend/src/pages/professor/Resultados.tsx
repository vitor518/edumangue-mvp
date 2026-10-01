import { Link, useParams } from 'react-router-dom';
import { Badge, Card, ErrorBox, PageHeader, Spinner, Stat } from '../../components/ui';
import { fmtDataHora, nota } from '../../lib/format';
import { useFetch } from '../../lib/useFetch';

interface Res {
  atividade: string; tipo: string; media: number | null; entregues: number; total_alunos: number;
  alunos: { aluno: string; entregue: boolean; nota: number | null; acertos: number | null; total: number | null; atrasada: boolean; entregue_em: string | null }[];
}

export function Resultados() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch<Res>(`atividades/${id}/resultados/`);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;

  return (
    <>
      <Link to="/professor/atividades" className="text-sm font-semibold text-mangue">← Atividades</Link>
      <PageHeader title={data.atividade} subtitle="Resultados por aluno" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Entregaram" value={`${data.entregues}/${data.total_alunos}`} />
        <Stat label="Média da turma" value={nota(data.media)} />
        <Stat label="Sem entrega" value={data.total_alunos - data.entregues} tone={data.total_alunos - data.entregues ? 'bad' : undefined} />
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linha bg-mare text-lama"><tr><th className="p-3">Aluno</th><th className="p-3">Situação</th><th className="p-3">Nota</th><th className="p-3">Acertos</th><th className="p-3">Entregue em</th></tr></thead>
          <tbody className="divide-y divide-linha">
            {data.alunos.map((a) => (
              <tr key={a.aluno}>
                <td className="p-3 font-semibold">{a.aluno}</td>
                <td className="p-3">{a.entregue ? <Badge tone={a.atrasada ? 'warn' : 'ok'}>{a.atrasada ? 'Com atraso' : 'Entregue'}</Badge> : <Badge tone="bad">Pendente</Badge>}</td>
                <td className="p-3 font-bold">{nota(a.nota)}</td>
                <td className="p-3">{a.entregue && data.tipo !== 'memoria' ? `${a.acertos}/${a.total}` : '—'}</td>
                <td className="p-3 text-lama">{fmtDataHora(a.entregue_em) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
