/** Modelo de um slide do telão (mapeado a partir de `Imovel`). */
export interface TelaoSlideModel {
  id: string
  title: string
  type: string
  purpose: 'Venda' | 'Aluguel'
  price: string
  location: string
  area?: string
  bedrooms: number
  bathrooms: number
  parking: number
  suites: number
  description: string
  features: string[]
  /** Fotos em ordem: use `img` + array `images` no JSON para adicionar mais. */
  photoUrls: string[]
  link: string
  /** Presente só em imóveis salvos localmente no dispositivo. */
  localDbId?: string
}
