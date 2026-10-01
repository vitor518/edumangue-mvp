import { useState } from 'react';
import { Button } from '../components/ui';
import { audioFeedback } from '../utils/audioFeedback';

interface Props {
  esquerda: string[];
  direita: string[];
  onFinish: (payload: { ligacoes: Record<string, string> }) => void;
  enviando?: boolean;
}

const CORES = ['bg-mangue-light border-mangue', 'bg-sol-light border-sol', 'bg-[#E4E9F5] border-[#5C74B8]', 'bg-caranguejo-light border-caranguejo',
  'bg-[#EADFF2] border-[#8A5CB8]', 'bg-[#DDEFF1] border-[#3E93A0]', 'bg-[#F1E6DA] border-lama', 'bg-[#E9F1D6] border-[#7DA02E]', 'bg-[#F5DDE8] border-[#B85C8A]', 'bg-[#E2E2E2] border-[#777]'];

export function ConexoesPlayer({ esquerda, direita, onFinish, enviando }: Props) {
  const [ligacoes, setLigacoes] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);

  const idxCor = (e: string) => esquerda.indexOf(e) % CORES.length;
  const dirLigada = (d: string) => Object.entries(ligacoes).find(([, v]) => v === d)?.[0];

  const clicarEsq = (e: string) => {
    audioFeedback.playClick();
    if (ligacoes[e]) { // desfaz
      setLigacoes(({ [e]: _, ...resto }) => resto);
      return;
    }
    setSel(sel === e ? null : e);
  };

  const clicarDir = (d: string) => {
    audioFeedback.playClick();
    const dona = dirLigada(d);
    if (dona) { setLigacoes(({ [dona]: _, ...resto }) => resto); return; }
    if (!sel) return;
    setLigacoes((l) => ({ ...l, [sel]: d }));
    setSel(null);
  };

  const completo = Object.keys(ligacoes).length === esquerda.length;

  return (
    <div>
      <p className="mb-4 text-sm text-lama">Toque em um item da esquerda e depois no que combina da direita. Toque de novo em um item ligado para desfazer.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          {esquerda.map((e) => {
            const ligado = !!ligacoes[e];
            return (
              <button key={e} onClick={() => clicarEsq(e)} aria-pressed={sel === e}
                className={`w-full rounded-xl border-2 p-3 text-left font-semibold transition-colors ${
                  ligado ? CORES[idxCor(e)] : sel === e ? 'border-mangue bg-white ring-4 ring-mangue/20' : 'border-linha bg-white hover:border-mangue/50'}`}>
                {e}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {direita.map((d) => {
            const dona = dirLigada(d);
            return (
              <button key={d} onClick={() => clicarDir(d)} disabled={!dona && !sel}
                className={`w-full rounded-xl border-2 p-3 text-left transition-colors disabled:cursor-default ${
                  dona ? CORES[idxCor(dona)] : sel ? 'border-linha bg-white hover:border-mangue' : 'border-linha bg-white'}`}>
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-lama">{Object.keys(ligacoes).length} / {esquerda.length} ligados</span>
        <Button onClick={() => onFinish({ ligacoes })} disabled={!completo || enviando}>{enviando ? 'Enviando…' : 'Enviar ligações'}</Button>
      </div>
    </div>
  );
}
