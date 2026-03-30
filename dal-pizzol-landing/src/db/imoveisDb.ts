import {
  idbDeleteLocalImovel,
  idbListLocalImoveis,
  idbPutLocalImovel,
  type LocalImovelRecord,
} from './localImoveisDb'
import {
  supabaseDeleteLocalImovel,
  supabaseListLocalImovelIds,
  supabaseListLocalImoveis,
  supabasePutLocalImovel,
} from './supabaseLocalImoveisDb'
import { isSupabaseConfigured } from '../lib/supabaseClient'

/**
 * Camada única de persistência:
 * - com Supabase configurado, tenta remoto;
 * - sem Supabase (ou em erro), usa IndexedDB local.
 */
export async function dbListLocalImoveis(): Promise<LocalImovelRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseListLocalImoveis()
    } catch (e) {
      console.warn('Falha ao listar via Supabase; usando IndexedDB local.', e)
    }
  }
  return idbListLocalImoveis()
}

export async function dbPutLocalImovel(record: LocalImovelRecord): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabasePutLocalImovel(record)
      return
    } catch (e) {
      console.warn('Falha ao salvar via Supabase; usando IndexedDB local.', e)
    }
  }
  await idbPutLocalImovel(record)
}

export async function dbDeleteLocalImovel(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabaseDeleteLocalImovel(id)
      return
    } catch (e) {
      console.warn('Falha ao apagar via Supabase; usando IndexedDB local.', e)
    }
  }
  await idbDeleteLocalImovel(id)
}

/**
 * Migra os registros existentes no IndexedDB para Supabase.
 * Seguro para repetir: ids ja existentes no remoto sao ignorados.
 */
export async function dbMigrateIndexedDbToSupabase(): Promise<{ migrated: number; skipped: number }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado para migração.')
  }
  const localRows = await idbListLocalImoveis()
  if (localRows.length === 0) return { migrated: 0, skipped: 0 }

  const remoteIds = await supabaseListLocalImovelIds()
  let migrated = 0
  let skipped = 0

  for (const row of localRows) {
    if (remoteIds.has(row.id)) {
      skipped += 1
      continue
    }
    await supabasePutLocalImovel(row)
    migrated += 1
  }

  return { migrated, skipped }
}

