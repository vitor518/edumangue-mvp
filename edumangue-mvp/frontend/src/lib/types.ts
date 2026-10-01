export type Papel = 'aluno' | 'professor' | 'coordenador';
export type TipoAtividade = 'quiz' | 'memoria' | 'conexoes';

export interface Usuario { id: number; username: string; nome: string; email: string; papel: Papel; escola_nome: string }
export interface Aviso { id: number; titulo: string; texto: string; autor_nome?: string; autor?: string; turma: number | string | null; turma_nome?: string | null; criado_em: string }
export interface Evento { id: number; titulo: string; tipo: string; data: string; turma: number | string | null; turma_nome?: string | null; descricao?: string }
export interface Freq { presentes: number; faltas: number; justificadas: number; percentual: number | null }

export interface Pergunta { enunciado: string; opcoes: string[]; correta?: number; explicacao?: string }
export type ConteudoQuiz = { perguntas: Pergunta[] };
export type ConteudoMemoria = { pares: { nome: string; imagem: string }[] };
export type ConteudoConexoes = { pares: { esquerda: string; direita: string }[] };

export const TIPO_LABEL: Record<TipoAtividade, string> = { quiz: 'Quiz', memoria: 'Memória', conexoes: 'Conexões' };
export const TIPO_EMOJI: Record<TipoAtividade, string> = { quiz: '❓', memoria: '🃏', conexoes: '🔗' };
