import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, Empty, ErrorBox, PageHeader, SectionTitle, Spinner, Stat } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { fmtData } from '../../lib/format';
import type { Aviso, Evento } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';

interface Painel {
  alocacoes: { id: number; turma: string; disciplina: string; chamada_feita_hoje: boolean; alunos: number }[];
  atividades_publicadas: number; entregas_recebidas: number; avisos: Aviso[]; eventos: Evento[];
}

export function ProfessorPainel() {
  const { usuario } = useAuth();
  const { data, loading, error, reload } = useFetch<Painel>('professor/painel/');
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? ''} onRetry={reload} />;
  const faltam = data.alocacoes.filter((a) => !a.chamada_feita_hoje).length;

  return (
    <>
      <PageHeader title={`Olá, ${usuario?.nome.split(' ')[0]}!`} subtitle={faltam ? `Você tem ${faltam} chamada(s) para fazer hoje.` : 'Todas as chamadas de hoje estão feitas.'} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Turmas/disciplinas" value={data.alocacoes.length} />
        <Stat label="Atividades publicadas" value={data.atividades_publicadas} />
        <Stat label="Entregas recebidas" value={data.entregas_recebidas} />
      </div>

      <Card className="mb-6">
        <SectionTitle>Chamada de hoje</SectionTitle>
        {data.alocacoes.length === 0 ? <Empty>Você ainda não foi alocado em nenhuma turma. Fale com a coordenação.</Empty> : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.alocacoes.map((a) => (
              <li key={a.id}>
                <Link to={`/professor/chamada/${a.id}`} className="flex items-center gap-3 rounded-xl border border-linha p-4 hover:border-mangue">
                  {a.chamada_feita_hoje ? <CheckCircle2 className="h-8 w-8 text-mangue" /> : <ClipboardCheck className="h-8 w-8 text-sol" />}
                  <div className="flex-1"><div className="font-bold">{a.turma} · {a.disciplina}</div><div className="text-sm text-lama">{a.alunos} alunos</div></div>
                  <Badge tone={a.chamada_feita_hoje ? 'ok' : 'warn'}>{a.chamada_feita_hoje ? 'Feita' : 'Pendente'}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle>Próximos eventos</SectionTitle>
          {data.eventos.length === 0 ? <Empty>Sem eventos.</Empty> : <ul className="space-y-2">{data.eventos.slice(0, 5).map((e) => <li key={e.id} className="flex gap-3 text-sm"><b className="w-14 text-mangue">{fmtData(e.data)}</b>{e.titulo} <span className="text-lama">({e.turma ?? 'escola'})</span></li>)}</ul>}
        </Card>
        <Card>
          <SectionTitle action={<Link to="/avisos" className="text-sm font-semibold text-mangue">Publicar</Link>}>Avisos recentes</SectionTitle>
          {data.avisos.length === 0 ? <Empty>Sem avisos.</Empty> : <ul className="space-y-2">{data.avisos.slice(0, 3).map((a) => <li key={a.id} className="text-sm"><b>{a.titulo}</b></li>)}</ul>}
        </Card>
      </div>
    </>
  );
}
