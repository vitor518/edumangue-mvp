import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, Empty, ErrorBox, PageHeader, SectionTitle, Spinner, Stat } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { fmtData, fmtDataHora, nota, pct } from '../../lib/format';
import { TIPO_EMOJI, TIPO_LABEL, type Aviso, type Evento, type Freq, type TipoAtividade } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';

interface Painel {
  turmas: string[];
  pendentes: { id: number; titulo: string; tipo: TipoAtividade; prazo: string | null; disciplina: string; atrasada: boolean }[];
  frequencia: Freq; media: number | null; entregas_feitas: number; avisos: Aviso[]; eventos: Evento[];
}

export function AlunoPainel() {
  const { usuario } = useAuth();
  const { data, loading, error, reload } = useFetch<Painel>('aluno/painel/');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const risco = data.frequencia.percentual != null && data.frequencia.percentual < 75;

  return (
    <>
      <PageHeader title={`Olá, ${usuario?.nome.split(' ')[0]}!`} subtitle={data.turmas.length ? `Turma ${data.turmas.join(', ')}` : 'Você ainda não está em nenhuma turma.'} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Atividades pendentes" value={data.pendentes.length} />
        <Stat label="Atividades entregues" value={data.entregas_feitas} />
        <Stat label="Média das notas" value={nota(data.media)} />
        <Stat label="Frequência" value={pct(data.frequencia.percentual)} tone={risco ? 'bad' : 'ok'} />
      </div>
      {risco && (
        <p className="mb-6 rounded-xl bg-caranguejo-light p-4 text-sm text-caranguejo" role="alert">
          Sua frequência está abaixo de 75%. Converse com seu professor ou com a coordenação.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <SectionTitle action={<Link to="/aluno/atividades" className="flex items-center gap-1 text-sm font-semibold text-mangue">Ver todas <ArrowRight className="h-4 w-4" /></Link>}>Para fazer</SectionTitle>
          {data.pendentes.length === 0 ? <Empty>Nada pendente. Bom trabalho! 🎉</Empty> : (
            <ul className="divide-y divide-linha">
              {data.pendentes.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to={`/aluno/atividades/${a.id}`} className="flex items-center gap-3 py-3 hover:bg-mare/60">
                    <span className="text-2xl" aria-hidden>{TIPO_EMOJI[a.tipo]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{a.titulo}</div>
                      <div className="text-sm text-lama">{a.disciplina} · {TIPO_LABEL[a.tipo]}</div>
                    </div>
                    {a.prazo && <Badge tone={a.atrasada ? 'bad' : 'warn'}>{a.atrasada ? 'Atrasada' : `até ${fmtDataHora(a.prazo)}`}</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6 md:col-span-2">
          <Card>
            <SectionTitle>Próximos eventos</SectionTitle>
            {data.eventos.length === 0 ? <Empty>Sem eventos.</Empty> : (
              <ul className="space-y-2">
                {data.eventos.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="w-14 shrink-0 text-sm font-bold text-mangue">{fmtData(e.data)}</span>
                    <span className="text-sm">{e.titulo}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <SectionTitle action={<Link to="/avisos" className="text-sm font-semibold text-mangue">Todos</Link>}>Avisos</SectionTitle>
            {data.avisos.length === 0 ? <Empty>Sem avisos.</Empty> : (
              <ul className="space-y-3">
                {data.avisos.slice(0, 3).map((a) => (
                  <li key={a.id}><div className="text-sm font-semibold">{a.titulo}</div><div className="line-clamp-2 text-sm text-lama">{a.texto}</div></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
