import { useCallback, useEffect, useRef, useState } from 'react'
import type { Imovel } from '../types/imovel'
import { TELAO_DESCRIPTION_MAX_CHARS } from '../constants/telaoDisplay'
import type { LocalImovelRecord } from '../db/localImoveisDb'
import { dbDeleteLocalImovel, dbListLocalImoveis, dbPutLocalImovel } from '../db/imoveisDb'

export type LocalImovelSummary = { id: string; title: string }
type LegacyLocalImovelRecord = LocalImovelRecord & {
  imageUrls?: unknown
  imageDataUrls?: unknown
  photoUrls?: unknown
  images?: unknown
  img?: unknown
}
export type LocalImovelFormData = {
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
}

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

function clampDescription(description: string): string | undefined {
  const trimmed = description.trim()
  if (!trimmed) return undefined
  if (trimmed.length <= TELAO_DESCRIPTION_MAX_CHARS) return trimmed
  return trimmed.slice(0, TELAO_DESCRIPTION_MAX_CHARS).trimEnd()
}

function normalizePageLink(pageLink: string): string | undefined {
  const trimmed = pageLink.trim()
  if (!trimmed) return undefined
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withProtocol).toString()
  } catch {
    return undefined
  }
}

function createLocalImovelId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  if (typeof value === 'string') return parseOptionalInt(value)
  return undefined
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed) out.push(trimmed)
  }
  return out
}

function readBlobArray(value: unknown): Blob[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Blob => item instanceof Blob)
}

function buildPhotoSet(row: LegacyLocalImovelRecord, objectUrlsOut: string[]): { img: string; images?: string[] } {
  const photoSet = new Set<string>()
  const allPhotos: string[] = []

  const push = (url: string | undefined) => {
    if (!url || photoSet.has(url)) return
    photoSet.add(url)
    allPhotos.push(url)
  }

  for (const blob of readBlobArray(row.imageBlobs)) {
    const objectUrl = URL.createObjectURL(blob)
    objectUrlsOut.push(objectUrl)
    push(objectUrl)
  }

  for (const url of readStringArray(row.imageBlobs)) push(url)
  for (const url of readStringArray(row.imageUrls)) push(url)
  for (const url of readStringArray(row.imageDataUrls)) push(url)
  for (const url of readStringArray(row.photoUrls)) push(url)
  for (const url of readStringArray(row.images)) push(url)
  push(normalizeOptionalString(row.img))

  const [img = '', ...images] = allPhotos
  return images.length ? { img, images } : { img }
}

function normalizeRecord(row: LegacyLocalImovelRecord): LocalImovelRecord {
  return {
    id: normalizeOptionalString(row.id) || createLocalImovelId(),
    createdAt: typeof row.createdAt === 'number' && Number.isFinite(row.createdAt) ? row.createdAt : Date.now(),
    title: normalizeOptionalString(row.title) || 'Imóvel local',
    price: normalizeOptionalString(row.price) || 'Consulte',
    location: normalizeOptionalString(row.location) || 'Bento Gonçalves · RS',
    description: normalizeOptionalString(row.description),
    propertyType: normalizeOptionalString(row.propertyType),
    listingKind: row.listingKind === 'aluguel' || row.listingKind === 'venda' ? row.listingKind : undefined,
    priceLabel: normalizeOptionalString(row.priceLabel),
    area: normalizeOptionalString(row.area),
    bedrooms: normalizeOptionalNumber(row.bedrooms),
    bathrooms: normalizeOptionalNumber(row.bathrooms),
    parking: normalizeOptionalNumber(row.parking),
    suites: normalizeOptionalNumber(row.suites),
    features: Array.isArray(row.features)
      ? row.features.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : undefined,
    pageLink: normalizePageLink(normalizeOptionalString(row.pageLink) || ''),
    imageBlobs: readBlobArray(row.imageBlobs),
  }
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
  const rowsRef = useRef<LocalImovelRecord[]>([])

  const revokeAll = useCallback(() => {
    for (const u of urlsRef.current) URL.revokeObjectURL(u)
    urlsRef.current = []
  }, [])

  const refresh = useCallback(async () => {
    revokeAll()
    try {
      const rows = await dbListLocalImoveis()
      const allUrls: string[] = []
      const normalizedRows: LocalImovelRecord[] = []
      const summariesOut: LocalImovelSummary[] = []
      const imoveis: Imovel[] = []

      for (const row of rows) {
        const legacyRow = row as LegacyLocalImovelRecord
        const normalized = normalizeRecord(legacyRow)
        normalizedRows.push(normalized)
        summariesOut.push({ id: normalized.id, title: normalized.title })

        const photos = buildPhotoSet(legacyRow, allUrls)
        const features = Array.isArray(legacyRow.features)
          ? legacyRow.features.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : normalized.features

        imoveis.push({
          title: normalized.title,
          price: normalized.price,
          location: normalized.location,
          ...photos,
          link: normalized.pageLink || `local://${normalized.id}`,
          description: normalized.description,
          propertyType: normalized.propertyType,
          listingKind: normalized.listingKind,
          priceLabel: normalized.priceLabel,
          area: normalized.area,
          bedrooms: normalized.bedrooms,
          bathrooms: normalized.bathrooms,
          parking: normalized.parking,
          suites: normalized.suites,
          features,
          localDbId: normalized.id,
        })
      }

      rowsRef.current = normalizedRows
      setSummaries(summariesOut)
      urlsRef.current = allUrls
      setLocalImoveis(imoveis)
    } catch {
      rowsRef.current = []
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
      const id = createLocalImovelId()
      const listingKind = input.listingKind
      const record: LocalImovelRecord = {
        id,
        createdAt: Date.now(),
        title: input.title.trim(),
        price: input.price.trim(),
        location: input.location.trim(),
        description: clampDescription(input.description),
        propertyType: input.propertyType.trim() || undefined,
        listingKind,
        priceLabel: listingKind === 'aluguel' ? 'Aluguel' : 'Venda',
        area: input.area.trim() || undefined,
        bedrooms: parseOptionalInt(input.bedrooms),
        bathrooms: parseOptionalInt(input.bathrooms),
        parking: parseOptionalInt(input.parking),
        suites: parseOptionalInt(input.suites),
        features: parseFeatures(input.featuresText),
        pageLink: normalizePageLink(input.pageLink),
        imageBlobs,
      }
      try {
        await dbPutLocalImovel(record)
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

  const getLocalImovelForEdit = useCallback(
    async (id: string): Promise<LocalImovelFormData> => {
      let row = rowsRef.current.find((x) => x.id === id)
      if (!row) {
        const rows = await dbListLocalImoveis()
        const normalizedRows = rows.map((x) => normalizeRecord(x as LegacyLocalImovelRecord))
        rowsRef.current = normalizedRows
        row = normalizedRows.find((x) => x.id === id)
      }
      if (!row) throw new Error('Imóvel não encontrado para edição.')
      return {
        title: row.title,
        price: row.price,
        location: row.location,
        description: row.description ?? '',
        propertyType: row.propertyType ?? 'Apartamento',
        listingKind: row.listingKind ?? 'venda',
        area: row.area ?? '',
        bedrooms: row.bedrooms?.toString() ?? '',
        bathrooms: row.bathrooms?.toString() ?? '',
        parking: row.parking?.toString() ?? '',
        suites: row.suites?.toString() ?? '',
        featuresText: row.features?.join(', ') ?? '',
        pageLink: row.pageLink ?? '',
      }
    },
    [],
  )

  const updateLocalImovel = useCallback(
    async (id: string, input: AddLocalImovelInput) => {
      let current = rowsRef.current.find((x) => x.id === id)
      if (!current) {
        const rows = await dbListLocalImoveis()
        const normalizedRows = rows.map((x) => normalizeRecord(x as LegacyLocalImovelRecord))
        rowsRef.current = normalizedRows
        current = normalizedRows.find((x) => x.id === id)
      }
      if (!current) throw new Error('Imóvel não encontrado para edição.')

      const imageBlobs =
        input.files.length > 0
          ? await Promise.all(
              input.files.map(async (file) => {
                const ab = await file.arrayBuffer()
                return new Blob([ab], { type: file.type || 'image/jpeg' })
              }),
            )
          : current.imageBlobs

      const listingKind = input.listingKind
      const record: LocalImovelRecord = {
        ...current,
        title: input.title.trim(),
        price: input.price.trim(),
        location: input.location.trim(),
        description: clampDescription(input.description),
        propertyType: input.propertyType.trim() || undefined,
        listingKind,
        priceLabel: listingKind === 'aluguel' ? 'Aluguel' : 'Venda',
        area: input.area.trim() || undefined,
        bedrooms: parseOptionalInt(input.bedrooms),
        bathrooms: parseOptionalInt(input.bathrooms),
        parking: parseOptionalInt(input.parking),
        suites: parseOptionalInt(input.suites),
        features: parseFeatures(input.featuresText),
        pageLink: normalizePageLink(input.pageLink),
        imageBlobs,
      }

      await dbPutLocalImovel(record)
      await refresh()
    },
    [refresh],
  )

  const deleteLocalImovel = useCallback(
    async (id: string) => {
      await dbDeleteLocalImovel(id)
      await refresh()
    },
    [refresh],
  )

  return {
    localImoveis,
    localSummaries: summaries,
    addLocalImovel,
    getLocalImovelForEdit,
    updateLocalImovel,
    deleteLocalImovel,
    refreshLocalImoveis: refresh,
  }
}
