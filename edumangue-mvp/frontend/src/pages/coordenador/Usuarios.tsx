import { Ban, Copy, Plus, Upload } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Badge, Button, Card, Empty, ErrorBox, Field, PageHeader, SectionTitle, Spinner, inputCls } from '../../components/ui';
import { api } from '../../lib/api';
import type { Papel } from '../../lib/types';
import { useFetch } from '../../lib/useFetch';

interface U { id: number; username: string; nome: string; first_name: string; last_name: string; email: string; papel: Papel; is_active: boolean }
interface Import { criados: { usuario: string; nome: string; papel: string; turma: string; senha_temporaria: string }[]; erros: { linha: number; erro: string }[] }

const MODELO = 'nome,usuario,email,papel,turma,responsavel,senha\nAna Souza,ana.souza,ana@ex.com,aluno,6º A,Maria Souza,\nProf. Carlos Lima,carlos,carlos@ex.com,professor,,,\n';

export function UsuariosPage() {
  const [filtro, setFiltro] = useState<'' | Papel>('');
  const [q, setQ] = useState('');
  const path = `usuarios/?${filtro ? `papel=${filtro}&` : ''}${q ? `q=${encodeURIComponent(q)}` : ''}`;
  const { data, loading, error, reload } = useFetch<U[]>(path);
  const [novo, setNovo] = useState({ first_name: '', last_name: '', username: '', papel: 'aluno', password: '' });
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [imp, setImp] = useState<Import | null>(null);
  const [impErro, setImpErro] = useState('');
  const arq = useRef<HTMLInputElement>(null);

  const criar = async (e: FormEvent) => {
    e.preventDefault(); setErro('');
    try { await api.post('usuarios/', novo); setNovo({ first_name: '', last_name: '', username: '', papel: 'aluno', password: '' }); setAberto(false); reload(); }
    catch (err) { setErro(err instanceof Error ? err.message : 'Erro'); }
  };

  const desativar = async (u: U) => {
    if (!confirm(`Desativar ${u.nome}? O histórico é mantido.`)) return;
    try { await api.del(`usuarios/${u.id}/`); reload(); } catch (err) { alert(err instanceof Error ? err.message : 'Erro'); }
  };

  const importar = async (file: File) => {
    setImpErro(''); setImp(null);
    const fd = new FormData(); fd.append('arquivo', file);
    try { setImp(await api.upload<Import>('usuarios/importar/', fd)); reload(); }
    catch (err) { setImpErro(err instanceof Error ? err.message : 'Erro'); }
    if (arq.current) arq.current.value = '';
  };

  const baixarModelo = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([MODELO], { type: 'text/csv;charset=utf-8' }));
    a.download = 'modelo-usuarios.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  const copiarSenhas = () => {
    const t = imp!.criados.filter((c) => c.senha_temporaria).map((c) => `${c.usuario}\t${c.senha_temporaria}`).join('\n');
    navigator.clipboard?.writeText(t);
  };

  return (
    <>
      <PageHeader title="Pessoas" subtitle="Cadastre alunos, professores e coordenadores."
        action={<Button onClick={() => setAberto(!aberto)}><Plus className="h-4 w-4" /> Novo usuário</Button>} />

      {aberto && (
        <Card className="mb-6">
          <form onSubmit={criar} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nome"><input className={inputCls} value={novo.first_name} onChange={(e) => setNovo({ ...novo, first_name: e.target.value })} required /></Field>
            <Field label="Sobrenome"><input className={inputCls} value={novo.last_name} onChange={(e) => setNovo({ ...novo, last_name: e.target.value })} /></Field>
            <Field label="Login"><input className={inputCls} value={novo.username} onChange={(e) => setNovo({ ...novo, username: e.target.value })} required autoCapitalize="none" /></Field>
            <Field label="Papel"><select className={inputCls} value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value })}><option value="aluno">Aluno</option><option value="professor">Professor</option><option value="coordenador">Coordenador</option></select></Field>
            <Field label="Senha inicial" hint="Mínimo 8 caracteres."><input className={inputCls} type="text" value={novo.password} onChange={(e) => setNovo({ ...novo, password: e.target.value })} required minLength={8} /></Field>
            <div className="flex items-end gap-3"><Button type="submit">Criar</Button>{erro && <span className="text-sm text-caranguejo" role="alert">{erro}</span>}</div>
          </form>
        </Card>
      )}

      <Card className="mb-6">
        <SectionTitle>Importar por CSV</SectionTitle>
        <p className="mb-3 text-sm text-lama">Colunas: <code>nome, usuario, papel</code> (obrigatórias) e <code>email, turma, responsavel, senha</code>. Sem senha, geramos uma temporária.</p>
        <div className="flex flex-wrap gap-2">
          <input ref={arq} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
          <Button onClick={() => arq.current?.click()}><Upload className="h-4 w-4" /> Enviar CSV</Button>
          <Button variant="secondary" onClick={baixarModelo}>Baixar modelo</Button>
        </div>
        {impErro && <p className="mt-3 text-sm text-caranguejo" role="alert">{impErro}</p>}
        {imp && (
          <div className="mt-4 space-y-3 text-sm" role="status">
            <p className="font-semibold text-mangue-dark">{imp.criados.length} usuário(s) criado(s).</p>
            {imp.criados.some((c) => c.senha_temporaria) && (
              <div className="rounded-xl bg-sol-light p-3">
                <div className="mb-2 flex items-center justify-between"><b>Senhas temporárias (mostradas só agora)</b><Button variant="secondary" onClick={copiarSenhas} className="!min-h-0 !py-1"><Copy className="h-3.5 w-3.5" /> Copiar</Button></div>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">{imp.criados.filter((c) => c.senha_temporaria).map((c) => <li key={c.usuario}><code>{c.usuario}</code> → <code>{c.senha_temporaria}</code></li>)}</ul>
              </div>
            )}
            {imp.erros.length > 0 && (
              <div className="rounded-xl bg-caranguejo-light p-3 text-caranguejo"><b>{imp.erros.length} linha(s) com erro:</b><ul className="mt-1 list-disc pl-5">{imp.erros.map((e, i) => <li key={i}>Linha {e.linha}: {e.erro}</li>)}</ul></div>
            )}
          </div>
        )}
      </Card>

      <div className="mb-3 flex flex-wrap gap-2">
        {([['', 'Todos'], ['aluno', 'Alunos'], ['professor', 'Professores'], ['coordenador', 'Coordenação']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${filtro === v ? 'bg-mangue text-white' : 'bg-white text-lama border border-linha'}`}>{l}</button>
        ))}
        <input className={`${inputCls} !w-56 !min-h-[40px] !rounded-full`} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
      </div>

      {loading ? <Spinner /> : error || !data ? <ErrorBox message={error ?? ''} onRetry={reload} /> : data.length === 0 ? <Empty>Ninguém encontrado.</Empty> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-linha bg-mare text-lama"><tr><th className="p-3">Nome</th><th className="p-3">Login</th><th className="p-3">Papel</th><th className="p-3">Situação</th><th /></tr></thead>
            <tbody className="divide-y divide-linha">
              {data.map((u) => (
                <tr key={u.id} className={u.is_active ? '' : 'opacity-50'}>
                  <td className="p-3 font-semibold">{u.nome}</td><td className="p-3 text-lama">{u.username}</td>
                  <td className="p-3 capitalize">{u.papel}</td>
                  <td className="p-3"><Badge tone={u.is_active ? 'ok' : 'neutral'}>{u.is_active ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="p-3 text-right">{u.is_active && <button onClick={() => desativar(u)} aria-label={`Desativar ${u.nome}`} className="rounded-lg p-2 text-lama hover:bg-caranguejo-light hover:text-caranguejo"><Ban className="h-4 w-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
