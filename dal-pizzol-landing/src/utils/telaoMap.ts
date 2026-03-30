import type { Imovel } from '../types/imovel'
import type { TelaoSlideModel } from '../types/telao'
import { getUniquePhotoUrls } from './gallery'

function firstInt(s: string | undefined, re: RegExp): number {
  if (!s) return 0
  const m = s.match(re)
  return m && m[1] ? parseInt(m[1], 10) || 0 : 0
}

function inferType(title: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim()
  const t = title.toLowerCase()
  if (t.includes('cobertura')) return 'Cobertura'
  if (t.includes('apart') || t.includes('apto')) return 'Apartamento'
  if (t.includes('sobrado')) return 'Sobrado'
  if (t.includes('casa')) return 'Casa'
  if (t.includes('terreno') || t.includes('lote')) return 'Terreno'
  if (t.includes('galpão') || t.includes('galpao')) return 'Galpão'
  if (t.includes('sala') || t.includes('comercial') || t.includes('loja')) return 'Sala Comercial'
  if (t.includes('sítio') || t.includes('sitio')) return 'Sítio'
  return 'Imóvel'
}

function resolvePurpose(imovel: Imovel): 'Venda' | 'Aluguel' {
  if (imovel.listingKind === 'aluguel') return 'Aluguel'
  if (imovel.listingKind === 'venda') return 'Venda'
  const pl = imovel.priceLabel?.toLowerCase() ?? ''
  if (pl.includes('aluguel') || pl.includes('locação') || pl.includes('locacao')) return 'Aluguel'
  return 'Venda'
}

function defaultFeatures(imovel: Imovel): string[] {
  if (imovel.features && imovel.features.length > 0) return imovel.features.slice(0, 8)
  const out: string[] = []
  if (imovel.specsLine1) {
    imovel.specsLine1.split('|').forEach((p) => {
      const x = p.trim()
      if (x) out.push(x)
    })
  }
  if (imovel.overlayCaption) out.push(imovel.overlayCaption)
  return out.slice(0, 6)
}

export function getTelaoGradient(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('apart') || t.includes('apto') || t.includes('cobert'))
    return 'linear-gradient(135deg,#0b1422 0%,#0f2040 100%)'
  if (t.includes('casa') || t.includes('sobrado')) return 'linear-gradient(135deg,#0a1a0a 0%,#0f3020 100%)'
  if (t.includes('terreno') || t.includes('lote')) return 'linear-gradient(135deg,#1a120a 0%,#3a200a 100%)'
  if (t.includes('comercial') || t.includes('sala') || t.includes('loja'))
    return 'linear-gradient(135deg,#120a1a 0%,#240a3a 100%)'
  if (t.includes('galpão') || t.includes('galpao') || t.includes('industrial'))
    return 'linear-gradient(135deg,#0f0f0f 0%,#1a1a1a 100%)'
  return 'linear-gradient(135deg,#0b0d12 0%,#141820 100%)'
}

export function imovelToTelaoSlide(imovel: Imovel, index: number): TelaoSlideModel {
  const specs1 = imovel.specsLine1 ?? ''
  const type = inferType(imovel.title, imovel.propertyType)
  const purpose = resolvePurpose(imovel)

  const bedrooms = imovel.bedrooms ?? firstInt(specs1, /(\d+)\s*Dorm/i)
  const suites = imovel.suites ?? firstInt(specs1, /(\d+)\s*Suite/i)
  const parking = imovel.parking ?? firstInt(specs1, /(\d+)\s*Vaga/i)
  const bathrooms = imovel.bathrooms ?? 0

  let area = imovel.area
  if (!area && imovel.specsLine2) {
    const m = imovel.specsLine2.match(/([\d.,]+\s*m²)/i)
    area = m ? m[1].replace(/\s+/g, ' ') : imovel.specsLine2
  }

  const photoUrls = getUniquePhotoUrls(imovel)

  const customDesc = imovel.description?.trim()
  let description =
    customDesc ||
    `Imóvel em ${imovel.location}. ${purpose === 'Aluguel' ? 'Disponível para locação.' : 'Disponível para venda.'} Consulte condições e agenda de visitas com a Dal Pizzol.`

  if (!customDesc && imovel.specsLine1) {
    description += ` ${imovel.specsLine1.trim()}.`
  }

  return {
    id: `${index}-${imovel.link}`,
    title: imovel.title,
    type,
    purpose,
    price: imovel.price,
    location: imovel.location,
    area,
    bedrooms,
    bathrooms,
    parking,
    suites,
    description,
    features: defaultFeatures(imovel),
    photoUrls,
    link: imovel.link,
    localDbId: imovel.localDbId,
  }
}

export function mapImoveisToTelao(imoveis: Imovel[]): TelaoSlideModel[] {
  return imoveis.map(imovelToTelaoSlide)
}
