import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, ErrorBox, Field, PageHeader, Spinner, inputCls } from '../../components/ui';
import { api } from '../../lib/api';
import { fromLocalInput, toLocalInput } from '../../lib/format';
import { TIPO_LABEL, type ConteudoConexoes, type ConteudoMemoria, type ConteudoQuiz, type TipoAtividade } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';

type Conteudo = ConteudoQuiz | ConteudoMemoria | ConteudoConexoes;
interface Aloc { id: number; turma_nome: string; disciplina_nome: string }
interface Existente { id: number; alocacao: number; titulo: string; descricao: string; tipo: TipoAtividade; conteudo: Conteudo; prazo: string | null; publicada: boolean; total_entregas: number }

const VAZIO: Record<TipoAtividade, Conteudo> = {
  quiz: { perguntas: [{ enunciado: '', opcoes: ['', ''], correta: 0, explicacao: '' }] },
  memoria: { pares: [{ nome: '', imagem: '' }, { nome: '', imagem: '' }] },
  conexoes: { pares: [{ esquerda: '', direita: '' }, { esquerda: '', direita: '' }] },
};

export function AtividadeForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const editando = !!id;
  const { data: alocs, loading: la } = useFetch<Aloc[]>('alocacoes/');
  const { data: atual, loading: lb, error } = useFetch<Existente>(editando ? `atividades/${id}/` : null);

  const [alocacao, setAlocacao] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoAtividade>('quiz');
  const [prazo, setPrazo] = useState('');
  const [publicada, setPublicada] = useState(false);
  const [conteudo, setConteudo] = useState<Conteudo>(VAZIO.quiz);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!atual) return;
    setAlocacao(String(atual.alocacao)); setTitulo(atual.titulo); setDescricao(atual.descricao);
    setTipo(atual.tipo); setPrazo(toLocalInput(atual.prazo)); setPublicada(atual.publicada); setConteudo(atual.conteudo);
  }, [atual]);

  const travado = !!atual && atual.total_entregas > 0;

  const trocarTipo = (t: TipoAtividade) => { setTipo(t); setConteudo(VAZIO[t]); };

  const salvar = async (e: FormEvent) => {
    e.preventDefault(); setErro(''); setSalvando(true);
    const corpo: any = { titulo, descricao, prazo: fromLocalInput(prazo), publicada };
    if (!travado) Object.assign(corpo, { alocacao: Number(alocacao), tipo, conteudo });
    try {
      if (editando) await api.patch(`atividades/${id}/`, corpo); else await api.post('atividades/', corpo);
      nav('/professor/atividades');
    } catch (err: any) {
      const f = err?.fields ?? {};
      setErro(f.conteudo?.[0] ?? f.non_field_errors?.[0] ?? err.message ?? 'Erro ao salvar.');
    } finally { setSalvando(false); }
  };

  if (la || lb) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  return (
    <form onSubmit={salvar} className="pb-8">
      <Link to="/professor/atividades" className="text-sm font-semibold text-mangue">← Atividades</Link>
      <PageHeader title={editando ? 'Editar atividade' : 'Nova atividade'} />

      <Card className="mb-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Título"><input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={150} /></Field>
          <Field label="Turma / disciplina">
            <select className={inputCls} value={alocacao} onChange={(e) => setAlocacao(e.target.value)} required disabled={travado}>
              <option value="" disabled>Escolha…</option>
              {alocs?.map((a) => <option key={a.id} value={a.id}>{a.turma_nome} · {a.disciplina_nome}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select className={inputCls} value={tipo} onChange={(e) => trocarTipo(e.target.value as TipoAtividade)} disabled={editando}>
              {(Object.keys(TIPO_LABEL) as TipoAtividade[]).map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="Prazo (opcional)"><input type="datetime-local" className={inputCls} value={prazo} onChange={(e) => setPrazo(e.target.value)} /></Field>
        </div>
        <Field label="Instruções (opcional)"><textarea className={inputCls} rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-mangue" checked={publicada} onChange={(e) => setPublicada(e.target.checked)} /> Publicar para os alunos agora</label>
      </Card>

      {travado ? (
        <p className="mb-6 rounded-xl bg-sol-light p-4 text-sm">Esta atividade já recebeu {atual!.total_entregas} entrega(s): o conteúdo não pode mais ser alterado (só título, instruções, prazo e publicação).</p>
      ) : tipo === 'quiz' ? <QuizEditor c={conteudo as ConteudoQuiz} set={setConteudo} />
        : tipo === 'memoria' ? <MemoriaEditor c={conteudo as ConteudoMemoria} set={setConteudo} />
        : <ConexoesEditor c={conteudo as ConteudoConexoes} set={setConteudo} />}

      {erro && <p className="mb-4 rounded-lg bg-caranguejo-light p-3 text-sm text-caranguejo" role="alert">{erro}</p>}
      <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar atividade'}</Button>
    </form>
  );
}

function QuizEditor({ c, set }: { c: ConteudoQuiz; set: (c: ConteudoQuiz) => void }) {
  const upd = (i: number, patch: Partial<ConteudoQuiz['perguntas'][0]>) =>
    set({ perguntas: c.perguntas.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  return (
    <div className="mb-6 space-y-4">
      {c.perguntas.map((p, i) => (
        <Card key={i} className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold">Pergunta {i + 1}</h3>
            {c.perguntas.length > 1 && <button type="button" aria-label="Remover pergunta" onClick={() => set({ perguntas: c.perguntas.filter((_, k) => k !== i) })} className="rounded-lg p-1.5 text-lama hover:bg-caranguejo-light hover:text-caranguejo"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <input className={inputCls} placeholder="Enunciado" value={p.enunciado} onChange={(e) => upd(i, { enunciado: e.target.value })} required />
          <div className="space-y-2">
            {p.opcoes.map((o, j) => (
              <div key={j} className="flex items-center gap-2">
                <input type="radio" name={`c${i}`} className="h-5 w-5 accent-mangue" checked={p.correta === j} onChange={() => upd(i, { correta: j })} aria-label={`Opção ${j + 1} é a correta`} />
                <input className={inputCls} placeholder={`Opção ${j + 1}`} value={o} onChange={(e) => upd(i, { opcoes: p.opcoes.map((x, k) => (k === j ? e.target.value : x)) })} required />
                {p.opcoes.length > 2 && <button type="button" aria-label="Remover opção" onClick={() => upd(i, { opcoes: p.opcoes.filter((_, k) => k !== j), correta: p.correta === j ? 0 : (p.correta! > j ? p.correta! - 1 : p.correta) })} className="p-2 text-lama"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            {p.opcoes.length < 6 && <Button type="button" variant="ghost" onClick={() => upd(i, { opcoes: [...p.opcoes, ''] })}><Plus className="h-4 w-4" /> Opção</Button>}
            <p className="text-xs text-lama">Marque o círculo da resposta correta.</p>
          </div>
          <input className={inputCls} placeholder="Explicação mostrada após a entrega (opcional)" value={p.explicacao ?? ''} onChange={(e) => upd(i, { explicacao: e.target.value })} />
        </Card>
      ))}
      {c.perguntas.length < 20 && <Button type="button" variant="secondary" onClick={() => set({ perguntas: [...c.perguntas, { enunciado: '', opcoes: ['', ''], correta: 0, explicacao: '' }] })}><Plus className="h-4 w-4" /> Adicionar pergunta</Button>}
    </div>
  );
}

function MemoriaEditor({ c, set }: { c: ConteudoMemoria; set: (c: ConteudoMemoria) => void }) {
  return (
    <Card className="mb-6 space-y-3">
      <h3 className="font-bold">Pares de cartas</h3>
      <p className="text-sm text-lama">Cada linha vira duas cartas iguais. Use um emoji como imagem (opcional).</p>
      {c.pares.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={`${inputCls} !w-20 text-center text-xl`} placeholder="🦀" value={p.imagem} maxLength={16} onChange={(e) => set({ pares: c.pares.map((x, k) => (k === i ? { ...x, imagem: e.target.value } : x)) })} aria-label="Emoji" />
          <input className={inputCls} placeholder="Nome" value={p.nome} maxLength={60} required onChange={(e) => set({ pares: c.pares.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)) })} />
          {c.pares.length > 2 && <button type="button" aria-label="Remover par" onClick={() => set({ pares: c.pares.filter((_, k) => k !== i) })} className="p-2 text-lama"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ))}
      {c.pares.length < 12 && <Button type="button" variant="secondary" onClick={() => set({ pares: [...c.pares, { nome: '', imagem: '' }] })}><Plus className="h-4 w-4" /> Par</Button>}
    </Card>
  );
}

function ConexoesEditor({ c, set }: { c: ConteudoConexoes; set: (c: ConteudoConexoes) => void }) {
  return (
    <Card className="mb-6 space-y-3">
      <h3 className="font-bold">Pares para ligar</h3>
      <p className="text-sm text-lama">O aluno verá as duas colunas embaralhadas e ligará cada item da esquerda ao da direita.</p>
      {c.pares.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={inputCls} placeholder="Ex.: Caranguejo-uçá" value={p.esquerda} maxLength={120} required onChange={(e) => set({ pares: c.pares.map((x, k) => (k === i ? { ...x, esquerda: e.target.value } : x)) })} />
          <span aria-hidden className="text-lama">↔</span>
          <input className={inputCls} placeholder="Ex.: Oxigena o solo" value={p.direita} maxLength={200} required onChange={(e) => set({ pares: c.pares.map((x, k) => (k === i ? { ...x, direita: e.target.value } : x)) })} />
          {c.pares.length > 2 && <button type="button" aria-label="Remover par" onClick={() => set({ pares: c.pares.filter((_, k) => k !== i) })} className="p-2 text-lama"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ))}
      {c.pares.length < 10 && <Button type="button" variant="secondary" onClick={() => set({ pares: [...c.pares, { esquerda: '', direita: '' }] })}><Plus className="h-4 w-4" /> Par</Button>}
    </Card>
  );
}
