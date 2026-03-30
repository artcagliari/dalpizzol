import { useEffect, useState } from 'react'
import type { Imovel } from '../types/imovel'
import { IMOVEIS_FALLBACK } from '../data/imoveisFallback'

/** JSON no servidor (edite em `public/imoveis.json` e faça deploy). */
const LOCAL_IMOVEIS_JSON = '/imoveis.json'

function isListingKind(x: unknown): x is 'aluguel' | 'venda' {
  return x === 'aluguel' || x === 'venda'
}

function isImovel(x: unknown): x is Imovel {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  if (
    typeof o.title !== 'string' ||
    typeof o.price !== 'string' ||
    typeof o.location !== 'string' ||
    typeof o.img !== 'string' ||
    typeof o.link !== 'string'
  ) {
    return false
  }
  if (o.images !== undefined) {
    if (!Array.isArray(o.images)) return false
    for (const it of o.images) {
      if (typeof it !== 'string') return false
    }
  }
  if (o.overlayCaption !== undefined && typeof o.overlayCaption !== 'string') return false
  if (o.specsLine1 !== undefined && typeof o.specsLine1 !== 'string') return false
  if (o.specsLine2 !== undefined && typeof o.specsLine2 !== 'string') return false
  if (o.priceLabel !== undefined && typeof o.priceLabel !== 'string') return false
  if (o.listingKind !== undefined && !isListingKind(o.listingKind)) return false
  if (o.propertyType !== undefined && typeof o.propertyType !== 'string') return false
  if (o.description !== undefined && typeof o.description !== 'string') return false
  if (o.area !== undefined && typeof o.area !== 'string') return false
  if (o.features !== undefined) {
    if (!Array.isArray(o.features)) return false
    for (const it of o.features) {
      if (typeof it !== 'string') return false
    }
  }
  for (const k of ['bedrooms', 'bathrooms', 'parking', 'suites'] as const) {
    if (o[k] !== undefined && typeof o[k] !== 'number') return false
  }
  return true
}

function parseImoveis(data: unknown): Imovel[] {
  if (!Array.isArray(data)) return []
  return data.filter(isImovel)
}

async function loadFirstValidJson(urls: string[]): Promise<Imovel[] | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue
      const json: unknown = await res.json()
      if (!Array.isArray(json)) continue
      return parseImoveis(json)
    } catch {
      continue
    }
  }
  return null
}

export type ImoveisLoadStatus = 'loading' | 'ready'

/**
 * Carrega só `public/imoveis.json` (array pode ser vazio). Se falhar, mantém lista vazia.
 */
export function useImoveis(): { imoveis: Imovel[]; loadStatus: ImoveisLoadStatus } {
  const [imoveis, setImoveis] = useState<Imovel[]>(() => [...IMOVEIS_FALLBACK])
  const [loadStatus, setLoadStatus] = useState<ImoveisLoadStatus>('loading')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const list = await loadFirstValidJson([LOCAL_IMOVEIS_JSON])
      if (!cancelled) {
        setImoveis(list ?? [])
        setLoadStatus('ready')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { imoveis, loadStatus }
}
