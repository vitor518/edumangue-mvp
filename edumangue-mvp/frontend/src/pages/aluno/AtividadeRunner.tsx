import { CheckCircle2, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, ErrorBox, Spinner } from '../../components/ui';
import { ConexoesPlayer } from '../../games/ConexoesPlayer';
import { MemoriaPlayer } from '../../games/MemoriaPlayer';
import { QuizPlayer } from '../../games/QuizPlayer';
import { api } from '../../lib/api';
import { fmtDataHora, nota } from '../../lib/format';
import { TIPO_LABEL, type Pergunta, type TipoAtividade } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';

interface Atividade {
  id: number; titulo: string; descricao: string; tipo: TipoAtividade; prazo: string | null; disciplina: string;
  conteudo: any; entrega: { nota: number; acertos: number; total: number; atrasada: boolean } | null;
}
interface Resultado { nota: number; acertos: number; total: number; feedback: any }

export function AtividadeRunner() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch<Atividade>(`aluno/atividades/${id}/`);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [iniciou, setIniciou] = useState(false);

  const enviar = useCallback(async (payload: unknown) => {
    setEnviando(true);
    setErroEnvio('');
    try { setResultado(await api.post<Resultado>(`aluno/atividades/${id}/entregar/`, payload)); }
    catch (e) { setErroEnvio(e instanceof Error ? e.message : 'Erro ao enviar.'); }
    finally { setEnviando(false); }
  }, [id]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error ?? 'Atividade não encontrada.'} onRetry={reload} />;

  const jaEntregue = data.entrega && !resultado;
  const cabecalho = (
    <div className="mb-6">
      <Link to="/aluno/atividades" className="text-sm font-semibold text-mangue">← Atividades</Link>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{data.titulo}</h1>
      <p className="text-lama">{data.disciplina} · {TIPO_LABEL[data.tipo]}{data.prazo ? ` · prazo ${fmtDataHora(data.prazo)}` : ''}</p>
    </div>
  );

  if (jaEntregue || resultado) {
    const r = resultado ?? { nota: data.entrega!.nota, acertos: data.entrega!.acertos, total: data.entrega!.total, feedback: null };
    return (
      <>
        {cabecalho}
        <Card className="mb-6 text-center">
          <div className="text-5xl" aria-hidden>{r.nota >= 7 ? '🎉' : r.nota >= 5 ? '👍' : '💪'}</div>
          <div className="mt-2 font-display text-5xl font-bold text-mangue">{nota(r.nota)}</div>
          <p className="mt-1 text-lama">{data.tipo === 'memoria' ? 'Você achou todos os pares.' : `${r.acertos} de ${r.total} corretas`}</p>
          {jaEntregue && <p className="mt-2 text-sm text-lama">Você já entregou esta atividade.</p>}
        </Card>
        {resultado && data.tipo === 'quiz' && <RevisaoQuiz perguntas={data.conteudo.perguntas} fb={resultado.feedback} />}
        {resultado && data.tipo === 'conexoes' && (
          <Card><h2 className="mb-3 text-lg font-bold">Suas ligações</h2>
            <ul className="space-y-2">
              {resultado.feedback.map((f: any) => (
                <li key={f.esquerda} className="flex items-start gap-2">
                  {f.acertou ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mangue" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-caranguejo" />}
                  <div><b>{f.esquerda}</b> → {f.direita}{!f.acertou && <div className="text-sm text-mangue-dark">Correto: {f.correta}</div>}</div>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="mt-6"><Link to="/aluno/atividades"><Button variant="secondary">Voltar às atividades</Button></Link></div>
      </>
    );
  }

  return (
    <>
      {cabecalho}
      {erroEnvio && <p className="mb-4 rounded-lg bg-caranguejo-light p-3 text-sm text-caranguejo" role="alert">{erroEnvio}</p>}
      {!iniciou ? (
        <Card>
          {data.descricao && <p className="mb-4">{data.descricao}</p>}
          <p className="mb-4 text-sm text-lama">Você pode entregar apenas uma vez. Tudo pronto?</p>
          <Button onClick={() => setIniciou(true)}>Começar</Button>
        </Card>
      ) : data.tipo === 'quiz' ? (
        <QuizPlayer perguntas={data.conteudo.perguntas} onFinish={enviar} enviando={enviando} />
      ) : data.tipo === 'memoria' ? (
        <MemoriaPlayer pares={data.conteudo.pares} onFinish={enviar} />
      ) : (
        <ConexoesPlayer esquerda={data.conteudo.esquerda} direita={data.conteudo.direita} onFinish={enviar} enviando={enviando} />
      )}
      {erroEnvio && data.tipo === 'memoria' && <div className="mt-4"><Button onClick={reload}>Recarregar</Button></div>}
    </>
  );
}

function RevisaoQuiz({ perguntas, fb }: { perguntas: Pergunta[]; fb: { correta: number; marcada: number; acertou: boolean; explicacao: string }[] }) {
  return (
    <div className="space-y-4">
      {perguntas.map((p, i) => (
        <Card key={i}>
          <div className="mb-2 flex items-start gap-2">
            {fb[i].acertou ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mangue" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-caranguejo" />}
            <h3 className="font-bold">{p.enunciado}</h3>
          </div>
          <p className="text-sm">Sua resposta: <b>{p.opcoes[fb[i].marcada]}</b></p>
          {!fb[i].acertou && <p className="text-sm text-mangue-dark">Correta: <b>{p.opcoes[fb[i].correta]}</b></p>}
          {fb[i].explicacao && <p className="mt-2 rounded-lg bg-sol-light p-3 text-sm">💡 {fb[i].explicacao}</p>}
        </Card>
      ))}
    </div>
  );
}
