/** Descrição no painel direito: evita texto que não cabe numa leitura só no telão. */
export const TELAO_DESCRIPTION_MAX_CHARS = 200

/** Título muito longo quebra o layout; corta com reticências. */
export const TELAO_TITLE_MAX_CHARS = 88

export function clampTelaoText(text: string, maxChars: number): string {
  const t = text.trim()
  if (t.length <= maxChars) return t
  const cut = t.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > maxChars * 0.55 ? cut.slice(0, lastSpace) : cut.trimEnd()
  return `${base}…`
}
