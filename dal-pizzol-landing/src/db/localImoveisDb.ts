/**
 * “Banco” local no navegador: IndexedDB guarda metadados + blobs das fotos.
 * Não substitui o JSON publicado; serve para cadastro rápido neste dispositivo.
 */
const DB_NAME = 'dalpizzol-local-imoveis'
const DB_VERSION = 1
const STORE = 'imoveis'
const LEGACY_DB_NAME_HINTS = ['dalpizzol', 'dal-pizzol', 'imoveis']

export type LocalImovelRecord = {
  id: string
  createdAt: number
  title: string
  price: string
  location: string
  description?: string
  propertyType?: string
  listingKind?: 'aluguel' | 'venda'
  priceLabel?: string
  area?: string
  bedrooms?: number
  bathrooms?: number
  parking?: number
  suites?: number
  features?: string[]
  pageLink?: string
  imageBlobs: Blob[]
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir IndexedDB'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

function openDbByName(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName)
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir IndexedDB'))
    req.onsuccess = () => resolve(req.result)
  })
}

async function getCandidateDbNames(): Promise<string[]> {
  const names = new Set<string>([DB_NAME])
  const withDatabasesApi = indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> }
  if (typeof withDatabasesApi.databases !== 'function') return Array.from(names)
  try {
    const dbs = await withDatabasesApi.databases()
    for (const db of dbs) {
      const name = db.name?.trim()
      if (!name) continue
      const lower = name.toLowerCase()
      if (LEGACY_DB_NAME_HINTS.some((hint) => lower.includes(hint))) names.add(name)
    }
  } catch {
    // noop: browsers sem suporte ou com política restrita.
  }
  return Array.from(names)
}

function readAllFromDb(db: IDBDatabase): Promise<LocalImovelRecord[]> {
  return new Promise((resolve, reject) => {
    const storeNames = Array.from(db.objectStoreNames)
    if (storeNames.length === 0) {
      db.close()
      resolve([])
      return
    }

    const readOrder = storeNames.includes(STORE)
      ? [STORE, ...storeNames.filter((name) => name !== STORE)]
      : storeNames

    const tx = db.transaction(readOrder, 'readonly')
    const merged = new Map<string, LocalImovelRecord>()

    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
    tx.oncomplete = () => {
      db.close()
      resolve(Array.from(merged.values()))
    }

    for (const storeName of readOrder) {
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as LocalImovelRecord[]) : []
        for (const row of rows) {
          const key = typeof (row as { id?: unknown }).id === 'string' ? (row as { id: string }).id : `${storeName}-${merged.size}`
          merged.set(key, row)
        }
      }
    }
  })
}

export async function idbListLocalImoveis(): Promise<LocalImovelRecord[]> {
  const names = await getCandidateDbNames()
  const merged = new Map<string, LocalImovelRecord>()

  for (const dbName of names) {
    try {
      const db = dbName === DB_NAME ? await openDb() : await openDbByName(dbName)
      const rows = await readAllFromDb(db)
      for (const row of rows) {
        const key = typeof (row as { id?: unknown }).id === 'string' ? (row as { id: string }).id : `${dbName}-${merged.size}`
        merged.set(key, row)
      }
    } catch {
      // Ignora bancos indisponíveis e tenta os próximos.
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const aTs = typeof a.createdAt === 'number' ? a.createdAt : 0
    const bTs = typeof b.createdAt === 'number' ? b.createdAt : 0
    return aTs - bTs
  })
}

export async function idbPutLocalImovel(record: LocalImovelRecord): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(record)
  })
}

export async function idbDeleteLocalImovel(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).delete(id)
  })
}
