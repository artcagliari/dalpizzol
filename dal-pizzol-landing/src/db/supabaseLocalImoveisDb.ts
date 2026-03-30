import { supabase } from '../lib/supabaseClient'
import type { LocalImovelRecord } from './localImoveisDb'

const TABLE = 'imoveis_local'
const BUCKET = 'imoveis-fotos'

type SupabaseImovelRow = {
  id: string
  created_at: number
  title: string
  price: string
  location: string
  description: string | null
  property_type: string | null
  listing_kind: 'aluguel' | 'venda' | null
  price_label: string | null
  area: string | null
  bedrooms: number | null
  bathrooms: number | null
  parking: number | null
  suites: number | null
  features: string[] | null
  page_link: string | null
  image_paths: string[]
}

function assertSupabase() {
  if (!supabase) {
    throw new Error('Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  }
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

async function uploadImages(id: string, blobs: Blob[]): Promise<string[]> {
  assertSupabase()
  const paths: string[] = []
  for (let i = 0; i < blobs.length; i += 1) {
    const blob = blobs[i]
    const ext = extFromMime(blob.type || 'image/jpeg')
    const path = `${id}/${i}-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase!.storage.from(BUCKET).upload(path, blob, {
      upsert: false,
      contentType: blob.type || 'image/jpeg',
    })
    if (error) throw error
    paths.push(path)
  }
  return paths
}

async function downloadImages(paths: string[]): Promise<Blob[]> {
  assertSupabase()
  const out: Blob[] = []
  for (const path of paths) {
    const { data, error } = await supabase!.storage.from(BUCKET).download(path)
    if (error) throw error
    out.push(data)
  }
  return out
}

export async function supabaseListLocalImoveis(): Promise<LocalImovelRecord[]> {
  assertSupabase()
  const { data, error } = await supabase!.from(TABLE).select('*').order('created_at', { ascending: true })
  if (error) throw error

  const rows = (data ?? []) as SupabaseImovelRow[]
  const mapped = await Promise.all(
    rows.map(async (row) => {
      const imageBlobs = await downloadImages(row.image_paths ?? [])
      const record: LocalImovelRecord = {
        id: row.id,
        createdAt: row.created_at,
        title: row.title,
        price: row.price,
        location: row.location,
        description: row.description ?? undefined,
        propertyType: row.property_type ?? undefined,
        listingKind: row.listing_kind ?? undefined,
        priceLabel: row.price_label ?? undefined,
        area: row.area ?? undefined,
        bedrooms: row.bedrooms ?? undefined,
        bathrooms: row.bathrooms ?? undefined,
        parking: row.parking ?? undefined,
        suites: row.suites ?? undefined,
        features: row.features ?? undefined,
        pageLink: row.page_link ?? undefined,
        imageBlobs,
      }
      return record
    }),
  )

  return mapped
}

export async function supabaseListLocalImovelIds(): Promise<Set<string>> {
  assertSupabase()
  const { data, error } = await supabase!.from(TABLE).select('id')
  if (error) throw error
  return new Set(((data ?? []) as Array<{ id: string }>).map((x) => x.id))
}

export async function supabasePutLocalImovel(record: LocalImovelRecord): Promise<void> {
  assertSupabase()
  const imagePaths = await uploadImages(record.id, record.imageBlobs)
  const row: Omit<SupabaseImovelRow, 'image_paths'> & { image_paths: string[] } = {
    id: record.id,
    created_at: record.createdAt,
    title: record.title,
    price: record.price,
    location: record.location,
    description: record.description ?? null,
    property_type: record.propertyType ?? null,
    listing_kind: record.listingKind ?? null,
    price_label: record.priceLabel ?? null,
    area: record.area ?? null,
    bedrooms: record.bedrooms ?? null,
    bathrooms: record.bathrooms ?? null,
    parking: record.parking ?? null,
    suites: record.suites ?? null,
    features: record.features ?? null,
    page_link: record.pageLink ?? null,
    image_paths: imagePaths,
  }
  const { error } = await supabase!.from(TABLE).insert(row)
  if (error) throw error
}

export async function supabaseDeleteLocalImovel(id: string): Promise<void> {
  assertSupabase()
  const { data, error } = await supabase!.from(TABLE).select('image_paths').eq('id', id).maybeSingle()
  if (error) throw error
  const paths = (data?.image_paths as string[] | undefined) ?? []

  const { error: deleteRowError } = await supabase!.from(TABLE).delete().eq('id', id)
  if (deleteRowError) throw deleteRowError

  if (paths.length > 0) {
    const { error: removeImagesError } = await supabase!.storage.from(BUCKET).remove(paths)
    if (removeImagesError) throw removeImagesError
  }
}

