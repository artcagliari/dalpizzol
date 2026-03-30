const brlNoCents = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const brlWithCents = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formata valores numéricos para BRL.
 * Se vier texto livre (ex.: "Consulte"), retorna o original.
 */
export function formatPriceBRL(raw: string | undefined): string {
  const src = raw?.trim() ?? ''
  if (!src) return 'Consulte-nos'

  const withoutCurrency = src.replace(/r\$/gi, '').trim()
  if (!withoutCurrency) return 'Consulte-nos'
  if (/[a-zA-Z]/.test(withoutCurrency)) return src

  const hasCents = /[.,]\d{1,2}$/.test(withoutCurrency)
  const normalized = withoutCurrency
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '')

  if (!normalized || !/\d/.test(normalized)) return src
  const value = Number(normalized)
  if (!Number.isFinite(value)) return src

  return hasCents ? brlWithCents.format(value) : brlNoCents.format(value)
}

