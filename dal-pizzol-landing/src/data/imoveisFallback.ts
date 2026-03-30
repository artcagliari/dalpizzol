import type { Imovel } from '../types/imovel'

/**
 * Lista inicial vazia; usada até o fetch de `public/imoveis.json` concluir.
 * Se o JSON remoto falhar e não houver resposta válida, mantém-se vazio.
 */
export const IMOVEIS_FALLBACK: readonly Imovel[] = []
