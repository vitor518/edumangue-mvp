import { AlertTriangle } from 'lucide-react';
import { Card, Empty, ErrorBox, FreqBar, PageHeader, SectionTitle, Spinner, Stat } from '../../components/ui';
import { nota, pct } from '../../lib/format';
import { useFetch } from '../../lib/useFetch';

interface Dash {
  totais: { alunos: number; professores: number; turmas: number };
  frequencia_turmas: { turma: string; alunos: number; percentual: number | null }[];
  frequencia_geral: number | null;
  alunos_em_risco: { id: number; aluno: string; turma: string; faltas: number; percentual: number }[];
  limite_risco: number;
  atividades: { publicadas: number; entregas: number; esperadas: number; taxa_entrega: number | null; media_notas: number | null };
}

export function CoordenadorDashboard() {
  const { data, loading, error, reload } = useFetch<Dash>('coordenador/dashboard/');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const { totais, atividades: at } = data;

  return (
    <>
      <PageHeader title="Painel da coordenação" subtitle="Visão geral da escola." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Alunos ativos" value={totais.alunos} />
        <Stat label="Professores" value={totais.professores} />
        <Stat label="Turmas" value={totais.turmas} />
        <Stat label="Frequência geral" value={pct(data.frequencia_geral)} tone={data.frequencia_geral != null && data.frequencia_geral < data.limite_risco ? 'bad' : 'ok'} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle>Frequência por turma</SectionTitle>
          {data.frequencia_turmas.length === 0 ? <Empty>Sem turmas.</Empty> : (
            <ul className="space-y-3">
              {data.frequencia_turmas.map((t) => (
                <li key={t.turma} className="flex items-center justify-between gap-3">
                  <div><div className="font-semibold">{t.turma}</div><div className="text-xs text-lama">{t.alunos} alunos</div></div>
                  <FreqBar value={t.percentual} limite={data.limite_risco} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Atividades</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Publicadas" value={at.publicadas} />
            <Stat label="Taxa de entrega" value={pct(at.taxa_entrega)} />
            <Stat label="Entregas recebidas" value={`${at.entregas}/${at.esperadas}`} />
            <Stat label="Média das notas" value={nota(at.media_notas)} />
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionTitle action={<span className="text-sm text-lama">abaixo de {data.limite_risco}% de presença</span>}>
          <span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-caranguejo" /> Alunos em risco por faltas</span>
        </SectionTitle>
        {data.alunos_em_risco.length === 0 ? <Empty>Nenhum aluno em risco no momento.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-lama"><tr><th className="py-2">Aluno</th><th>Turma</th><th>Faltas</th><th>Presença</th></tr></thead>
              <tbody className="divide-y divide-linha">
                {data.alunos_em_risco.map((a) => (
                  <tr key={a.id}><td className="py-2.5 font-semibold">{a.aluno}</td><td>{a.turma}</td><td>{a.faltas}</td><td><FreqBar value={a.percentual} limite={data.limite_risco} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
