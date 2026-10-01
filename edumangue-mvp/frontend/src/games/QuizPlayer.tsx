import { useState } from 'react';
import { Button } from '../components/ui';
import type { Pergunta } from '../lib/types';

interface Props { perguntas: Pergunta[]; onFinish: (payload: { respostas: number[] }) => void; enviando?: boolean }

export function QuizPlayer({ perguntas, onFinish, enviando }: Props) {
  const [idx, setIdx] = useState(0);
  const [marcadas, setMarcadas] = useState<(number | null)[]>(() => perguntas.map(() => null));
  const p = perguntas[idx];
  const ultima = idx === perguntas.length - 1;
  const atual = marcadas[idx];

  const marcar = (i: number) => setMarcadas((m) => m.map((v, k) => (k === idx ? i : v)));
  const avancar = () => (ultima ? onFinish({ respostas: marcadas as number[] }) : setIdx(idx + 1));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-mare" role="progressbar" aria-valuemin={0} aria-valuemax={perguntas.length} aria-valuenow={idx + 1}>
          <div className="h-full bg-mangue transition-all" style={{ width: `${((idx + 1) / perguntas.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-lama">{idx + 1} / {perguntas.length}</span>
      </div>

      <h2 className="mb-4 text-xl font-bold">{p.enunciado}</h2>
      <div className="space-y-2" role="radiogroup" aria-label="Opções">
        {p.opcoes.map((o, i) => (
          <button
            key={i} role="radio" aria-checked={atual === i} onClick={() => marcar(i)}
            className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
              atual === i ? 'border-mangue bg-mangue-light' : 'border-linha bg-white hover:border-mangue/50'
            }`}
          >
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${atual === i ? 'border-mangue bg-mangue text-white' : 'border-linha'}`}>
              {String.fromCharCode(65 + i)}
            </span>
            <span>{o}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="secondary" onClick={() => setIdx(idx - 1)} disabled={idx === 0}>Anterior</Button>
        <Button onClick={avancar} disabled={atual === null || enviando}>
          {ultima ? (enviando ? 'Enviando…' : 'Enviar respostas') : 'Próxima'}
        </Button>
      </div>
    </div>
  );
}
