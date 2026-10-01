import { useEffect, useMemo, useRef, useState } from 'react';
import { audioFeedback } from '../utils/audioFeedback';

interface Par { nome: string; imagem: string }
interface Carta { uid: string; par: number; nome: string; imagem: string }
interface Props { pares: Par[]; onFinish: (payload: { tentativas: number; tempo: number }) => void }

function embaralhar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MemoriaPlayer({ pares, onFinish }: Props) {
  const cartas = useMemo<Carta[]>(
    () => embaralhar(pares.flatMap((p, i) => [0, 1].map((k) => ({ uid: `${i}-${k}`, par: i, ...p })))),
    [pares],
  );
  const [viradas, setViradas] = useState<string[]>([]);
  const [achadas, setAchadas] = useState<Set<number>>(new Set());
  const [tentativas, setTentativas] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const bloqueado = useRef(false);
  const terminou = achadas.size === pares.length;

  useEffect(() => {
    if (terminou) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [terminou]);

  const virar = (c: Carta) => {
    if (bloqueado.current || terminou || viradas.includes(c.uid) || achadas.has(c.par)) return;
    audioFeedback.playClick();
    const novas = [...viradas, c.uid];
    setViradas(novas);
    if (novas.length < 2) return;

    bloqueado.current = true;
    const [a, b] = novas.map((u) => cartas.find((x) => x.uid === u)!);
    setTentativas((t) => t + 1);
    setTimeout(() => {
      if (a.par === b.par) {
        audioFeedback.playMatch();
        setAchadas((s) => new Set(s).add(a.par));
      } else {
        audioFeedback.playError();
      }
      setViradas([]);
      bloqueado.current = false;
    }, 900);
  };

  // Ao concluir, avisa o pai uma única vez (tentativas já inclui a última jogada).
  const enviado = useRef(false);
  useEffect(() => {
    if (terminou && !enviado.current) {
      enviado.current = true;
      audioFeedback.playVictory();
      onFinish({ tentativas, tempo: segundos });
    }
  }, [terminou, tentativas, segundos, onFinish]);

  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  const colunas = cartas.length <= 8 ? 'grid-cols-4' : cartas.length <= 12 ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-4 sm:grid-cols-6';

  return (
    <div>
      <div className="mb-4 flex gap-6 text-sm font-semibold text-lama">
        <span>Pares: <b className="text-raiz">{achadas.size}/{pares.length}</b></span>
        <span>Tentativas: <b className="text-raiz">{tentativas}</b></span>
        <span>Tempo: <b className="text-raiz">{mm}:{ss}</b></span>
      </div>
      <div className={`grid grid-cols-1 gap-3 ${colunas}`}>
        {cartas.map((c) => {
          const aberta = viradas.includes(c.uid) || achadas.has(c.par);
          return (
            <button
              key={c.uid} onClick={() => virar(c)} aria-label={aberta ? c.nome : 'Carta virada para baixo'}
              className="relative aspect-square [perspective:600px]"
            >
              <div className={`preserve-3d h-full w-full transition-transform duration-500 ${aberta ? 'rotate-y-180' : ''}`}>
                <div className="backface-hidden absolute inset-0 flex items-center justify-center rounded-xl bg-mangue text-3xl text-white/70">🌿</div>
                <div className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-xl border-4 bg-white p-1 ${achadas.has(c.par) ? 'border-mangue bg-mangue-light' : 'border-linha'}`}>
                  {c.imagem && <span className="text-3xl sm:text-4xl">{c.imagem}</span>}
                  <span className="mt-1 text-center text-[11px] font-semibold leading-tight sm:text-xs">{c.nome}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
