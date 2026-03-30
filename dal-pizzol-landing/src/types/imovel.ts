/**
 * Dados do card (layout mobile Dal Pizzol).
 * `images`: galeria; a foto principal do card é sempre `img`.
 */
export interface Imovel {
  title: string
  price: string
  location: string
  img: string
  link: string
  images?: string[]
  /** Texto sobre o degradê da foto principal, ex.: "Apartamentos · DLPA319" */
  overlayCaption?: string
  /** Primeira linha de especificações (cinza). */
  specsLine1?: string
  /** Segunda linha, ex.: metragem. */
  specsLine2?: string
  /** Rótulo acima do valor, ex.: "Aluguel" ou "Venda". */
  priceLabel?: string
  /** Define o texto do botão dourado do header: ALUGAR vs COMPRAR. */
  listingKind?: 'aluguel' | 'venda'
  /** Telão / ficha: tipo exibido na badge (ex.: Apartamento). */
  propertyType?: string
  description?: string
  features?: string[]
  area?: string
  bedrooms?: number
  bathrooms?: number
  parking?: number
  suites?: number
  /**
   * Imóvel criado no navegador (IndexedDB). Usado para revogar URLs de blob e apagar o registro.
   */
  localDbId?: string
}
