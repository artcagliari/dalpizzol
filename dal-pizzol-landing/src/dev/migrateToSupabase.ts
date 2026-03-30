import { dbMigrateIndexedDbToSupabase } from '../db/imoveisDb'
import { isSupabaseConfigured } from '../lib/supabaseClient'

declare global {
  interface Window {
    migrateLocalImoveisToSupabase?: () => Promise<void>
  }
}

/**
 * Helper de migração manual para desenvolvimento.
 * Uso no console do navegador: `migrateLocalImoveisToSupabase()`
 */
export function registerSupabaseMigrationHelper(): void {
  if (typeof window === 'undefined') return

  window.migrateLocalImoveisToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase não configurado. Preencha .env e recarregue o app.')
      return
    }
    try {
      const result = await dbMigrateIndexedDbToSupabase()
      console.info(
        `Migração concluída. Migrados: ${result.migrated}. Ignorados (já existiam): ${result.skipped}.`,
      )
    } catch (e) {
      console.error('Falha na migração para Supabase.', e)
    }
  }
}

