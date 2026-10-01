import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Card, Empty, ErrorBox, PageHeader, SectionTitle, Spinner, inputCls } from '../../components/ui';
import { api } from '../../lib/api';
import { useFetch } from '../../lib/useFetch';

interface Turma { id: number; nome: string; ano_letivo: number; total_alunos: number }
interface Disc { id: number; nome: string }
interface Aloc { id: number; turma: number; turma_nome: string; disciplina_nome: string; professor_nome: string }
interface Mat { id: number; aluno_nome: string; turma_nome: string }
interface U { id: number; nome: string }

async function tentar(fn: () => Promise<unknown>, depois: () => void) {
  try { await fn(); depois(); } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
}

export function EstruturaPage() {
  const turmas = useFetch<Turma[]>('turmas/');
  const discs = useFetch<Disc[]>('disciplinas/');
  const alocs = useFetch<Aloc[]>('alocacoes/');
  const profs = useFetch<U[]>('usuarios/?papel=professor');
  const alunos = useFetch<U[]>('usuarios/?papel=aluno');
  const [turmaSel, setTurmaSel] = useState('');
  const mats = useFetch<Mat[]>(turmaSel ? `matriculas/?turma=${turmaSel}` : null);

  const [nt, setNt] = useState({ nome: '', ano_letivo: new Date().getFullYear() });
  const [nd, setNd] = useState('');
  const [na, setNa] = useState({ turma: '', disciplina: '', professor: '' });
  const [nm, setNm] = useState('');

  const carregando = turmas.loading || discs.loading || alocs.loading || profs.loading || alunos.loading;
  const erro = turmas.error || discs.error || alocs.error || profs.error || alunos.error;
  if (carregando) return <Spinner />;
  if (erro) return <ErrorBox message={erro} onRetry={() => { turmas.reload(); discs.reload(); alocs.reload(); }} />;

  const sub = (fn: () => Promise<unknown>, depois: () => void) => (e: FormEvent) => { e.preventDefault(); tentar(fn, depois); };

  return (
    <>
      <PageHeader title="Turmas e disciplinas" subtitle="Monte a estrutura: turmas, disciplinas, quem leciona o quê e quem estuda onde." />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle>Turmas</SectionTitle>
          <form className="mb-3 flex gap-2" onSubmit={sub(() => api.post('turmas/', nt), () => { setNt({ ...nt, nome: '' }); turmas.reload(); })}>
            <input className={inputCls} placeholder="Ex.: 7º B" value={nt.nome} onChange={(e) => setNt({ ...nt, nome: e.target.value })} required />
            <input className={`${inputCls} !w-24`} type="number" value={nt.ano_letivo} onChange={(e) => setNt({ ...nt, ano_letivo: Number(e.target.value) })} aria-label="Ano letivo" />
            <Button type="submit">Add</Button>
          </form>
          {turmas.data?.length ? (
            <ul className="divide-y divide-linha">{turmas.data.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2"><span><b>{t.nome}</b> <span className="text-sm text-lama">{t.ano_letivo} · {t.total_alunos} alunos</span></span>
                <button aria-label={`Excluir ${t.nome}`} className="p-2 text-lama hover:text-caranguejo" onClick={() => confirm(`Excluir turma ${t.nome}?`) && tentar(() => api.del(`turmas/${t.id}/`), turmas.reload)}><Trash2 className="h-4 w-4" /></button></li>
            ))}</ul>) : <Empty>Nenhuma turma.</Empty>}
        </Card>

        <Card>
          <SectionTitle>Disciplinas</SectionTitle>
          <form className="mb-3 flex gap-2" onSubmit={sub(() => api.post('disciplinas/', { nome: nd }), () => { setNd(''); discs.reload(); })}>
            <input className={inputCls} placeholder="Ex.: Matemática" value={nd} onChange={(e) => setNd(e.target.value)} required />
            <Button type="submit">Add</Button>
          </form>
          {discs.data?.length ? (
            <ul className="divide-y divide-linha">{discs.data.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2"><b>{d.nome}</b>
                <button aria-label={`Excluir ${d.nome}`} className="p-2 text-lama hover:text-caranguejo" onClick={() => confirm(`Excluir ${d.nome}?`) && tentar(() => api.del(`disciplinas/${d.id}/`), discs.reload)}><Trash2 className="h-4 w-4" /></button></li>
            ))}</ul>) : <Empty>Nenhuma disciplina.</Empty>}
        </Card>
      </div>

      <Card className="mt-6">
        <SectionTitle>Quem leciona o quê</SectionTitle>
        <form className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4" onSubmit={sub(() => api.post('alocacoes/', { turma: +na.turma, disciplina: +na.disciplina, professor: +na.professor }), () => { setNa({ turma: '', disciplina: '', professor: '' }); alocs.reload(); })}>
          <select className={inputCls} value={na.turma} onChange={(e) => setNa({ ...na, turma: e.target.value })} required aria-label="Turma"><option value="">Turma…</option>{turmas.data?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
          <select className={inputCls} value={na.disciplina} onChange={(e) => setNa({ ...na, disciplina: e.target.value })} required aria-label="Disciplina"><option value="">Disciplina…</option>{discs.data?.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
          <select className={inputCls} value={na.professor} onChange={(e) => setNa({ ...na, professor: e.target.value })} required aria-label="Professor"><option value="">Professor…</option>{profs.data?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <Button type="submit">Alocar</Button>
        </form>
        {alocs.data?.length ? (
          <ul className="divide-y divide-linha">{alocs.data.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2"><span><b>{a.turma_nome}</b> · {a.disciplina_nome} · <span className="text-lama">{a.professor_nome}</span></span>
              <button aria-label="Remover alocação" className="p-2 text-lama hover:text-caranguejo" onClick={() => confirm('Remover esta alocação?') && tentar(() => api.del(`alocacoes/${a.id}/`), alocs.reload)}><Trash2 className="h-4 w-4" /></button></li>
          ))}</ul>) : <Empty>Nenhuma alocação.</Empty>}
      </Card>

      <Card className="mt-6">
        <SectionTitle>Matrículas</SectionTitle>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select className={inputCls} value={turmaSel} onChange={(e) => setTurmaSel(e.target.value)} aria-label="Turma das matrículas"><option value="">Escolha a turma…</option>{turmas.data?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
          {turmaSel && (
            <form className="flex gap-2 sm:col-span-2" onSubmit={sub(() => api.post('matriculas/', { turma: +turmaSel, aluno: +nm }), () => { setNm(''); mats.reload(); turmas.reload(); })}>
              <select className={inputCls} value={nm} onChange={(e) => setNm(e.target.value)} required aria-label="Aluno"><option value="">Aluno…</option>{alunos.data?.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
              <Button type="submit">Matricular</Button>
            </form>
          )}
        </div>
        {!turmaSel ? <Empty>Escolha uma turma.</Empty> : mats.loading ? <Spinner /> : mats.data?.length ? (
          <ul className="divide-y divide-linha">{mats.data.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2"><span>{m.aluno_nome}</span>
              <button aria-label={`Remover ${m.aluno_nome}`} className="p-2 text-lama hover:text-caranguejo" onClick={() => confirm(`Remover ${m.aluno_nome} da turma?`) && tentar(() => api.del(`matriculas/${m.id}/`), () => { mats.reload(); turmas.reload(); })}><Trash2 className="h-4 w-4" /></button></li>
          ))}</ul>) : <Empty>Turma sem alunos.</Empty>}
      </Card>
    </>
  );
}
