import { useCallback, useEffect, useRef, useState } from 'react'
import type { Imovel } from '../types/imovel'
import {
  idbDeleteLocalImovel,
  idbListLocalImoveis,
  idbPutLocalImovel,
  type LocalImovelRecord,
} from '../db/localImoveisDb'

export type LocalImovelSummary = { id: string; title: string }

function parseOptionalInt(s: string): number | undefined {
  const t = s.trim()
  if (!t) return undefined
  const n = parseInt(t.replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

function parseFeatures(text: string): string[] | undefined {
  const parts = text
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
  return parts.length ? parts : undefined
}

export type AddLocalImovelInput = {
  title: string
  price: string
  location: string
  description: string
  propertyType: string
  listingKind: 'aluguel' | 'venda'
  area: string
  bedrooms: string
  bathrooms: string
  parking: string
  suites: string
  featuresText: string
  pageLink: string
  files: File[]
}

/**
 * Imóveis criados no aparelho (upload de fotos + dados em IndexedDB).
 */
export function useLocalImoveis() {
  const [localImoveis, setLocalImoveis] = useState<Imovel[]>([])
  const [summaries, setSummaries] = useState<LocalImovelSummary[]>([])
  const urlsRef = useRef<string[]>([])

  const revokeAll = useCallback(() => {
    for (const u of urlsRef.current) URL.revokeObjectURL(u)
    urlsRef.current = []
  }, [])

  const refresh = useCallback(async () => {
    revokeAll()
    try {
      const rows = await idbListLocalImoveis()
      setSummaries(rows.map((r) => ({ id: r.id, title: r.title })))
      const allUrls: string[] = []
      const imoveis: Imovel[] = rows.map((row) => {
        const blobs = row.imageBlobs ?? []
        const objectUrls = blobs.map((b) => {
          const u = URL.createObjectURL(b)
          allUrls.push(u)
          return u
        })
        const img = objectUrls[0] ?? ''
        const rest = objectUrls.slice(1)
        return {
          title: row.title,
          price: row.price,
          location: row.location,
          img,
          ...(rest.length ? { images: rest } : {}),
          link: row.pageLink?.trim() || `local://${row.id}`,
          description: row.description,
          propertyType: row.propertyType,
          listingKind: row.listingKind,
          priceLabel: row.priceLabel,
          area: row.area,
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          parking: row.parking,
          suites: row.suites,
          features: row.features,
          localDbId: row.id,
        }
      })
      urlsRef.current = allUrls
      setLocalImoveis(imoveis)
    } catch {
      setSummaries([])
      setLocalImoveis([])
    }
  }, [revokeAll])

  useEffect(() => {
    let cancelled = false
    const raf = requestAnimationFrame(() => {
      if (!cancelled) void refresh()
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      revokeAll()
    }
  }, [refresh, revokeAll])

  const addLocalImovel = useCallback(
    async (input: AddLocalImovelInput) => {
      if (input.files.length === 0) throw new Error('Inclua pelo menos uma foto.')
      /** Cópias em Blob evitam falhas de clonagem no IndexedDB com alguns objetos File. */
      const imageBlobs: Blob[] = await Promise.all(
        input.files.map(async (file) => {
          const ab = await file.arrayBuffer()
          return new Blob([ab], { type: file.type || 'image/jpeg' })
        }),
      )
      const id = crypto.randomUUID()
      const listingKind = input.listingKind
      const record: LocalImovelRecord = {
        id,
        createdAt: Date.now(),
        title: input.title.trim(),
        price: input.price.trim(),
        location: input.location.trim(),
        description: input.description.trim() || undefined,
        propertyType: input.propertyType.trim() || undefined,
        listingKind,
        priceLabel: listingKind === 'aluguel' ? 'Aluguel' : 'Venda',
        area: input.area.trim() || undefined,
        bedrooms: parseOptionalInt(input.bedrooms),
        bathrooms: parseOptionalInt(input.bathrooms),
        parking: parseOptionalInt(input.parking),
        suites: parseOptionalInt(input.suites),
        features: parseFeatures(input.featuresText),
        pageLink: input.pageLink.trim() || undefined,
        imageBlobs,
      }
      try {
        await idbPutLocalImovel(record)
      } catch (e) {
        const name = e instanceof DOMException ? e.name : (e as Error)?.name
        if (name === 'QuotaExceededError') {
          throw new Error('Espaço do navegador cheio. Apague imóveis locais ou use imagens menores.')
        }
        throw new Error(
          'Não foi possível guardar no armazenamento local. Verifique se o modo privado permite IndexedDB ou tente outro navegador.',
        )
      }
      await refresh()
    },
    [refresh],
  )

  const deleteLocalImovel = useCallback(
    async (id: string) => {
      await idbDeleteLocalImovel(id)
      await refresh()
    },
    [refresh],
  )

  return {
    localImoveis,
    localSummaries: summaries,
    addLocalImovel,
    deleteLocalImovel,
    refreshLocalImoveis: refresh,
  }
}
