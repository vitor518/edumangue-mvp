import { Card, Empty, ErrorBox, FreqBar, PageHeader, SectionTitle, Spinner, Stat, Badge } from '../../components/ui';
import { fmtData, pct } from '../../lib/format';
import type { Freq } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';

interface Dados {
  geral: Freq; limite: number;
  disciplinas: (Freq & { disciplina: string })[];
  faltas_recentes: { data: string; disciplina: string; status: 'F' | 'J' }[];
}

export function AlunoFrequencia() {
  const { data, loading, error, reload } = useFetch<Dados>('aluno/frequencia/');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const risco = data.geral.percentual != null && data.geral.percentual < data.limite;

  return (
    <>
      <PageHeader title="Minha frequência" subtitle={`O mínimo exigido é ${data.limite}% de presença.`} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Presença geral" value={pct(data.geral.percentual)} tone={risco ? 'bad' : 'ok'} />
        <Stat label="Presenças" value={data.geral.presentes} />
        <Stat label="Faltas" value={data.geral.faltas} tone={data.geral.faltas ? 'bad' : undefined} />
        <Stat label="Justificadas" value={data.geral.justificadas} />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle>Por disciplina</SectionTitle>
          {data.disciplinas.length === 0 ? <Empty>Ainda sem chamadas registradas.</Empty> : (
            <ul className="space-y-3">
              {data.disciplinas.map((d) => (
                <li key={d.disciplina} className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{d.disciplina}</span><FreqBar value={d.percentual} limite={data.limite} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <SectionTitle>Faltas recentes</SectionTitle>
          {data.faltas_recentes.length === 0 ? <Empty>Nenhuma falta. 👏</Empty> : (
            <ul className="divide-y divide-linha">
              {data.faltas_recentes.map((f, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span>{fmtData(f.data)} · {f.disciplina}</span>
                  <Badge tone={f.status === 'J' ? 'neutral' : 'bad'}>{f.status === 'J' ? 'Justificada' : 'Falta'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
