/**
 * “Banco” local no navegador: IndexedDB guarda metadados + blobs das fotos.
 * Não substitui o JSON publicado; serve para cadastro rápido neste dispositivo.
 */
const DB_NAME = 'dalpizzol-local-imoveis'
const DB_VERSION = 1
const STORE = 'imoveis'

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

export async function idbListLocalImoveis(): Promise<LocalImovelRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const r = tx.objectStore(STORE).getAll()
    r.onerror = () => {
      db.close()
      reject(r.error)
    }
    r.onsuccess = () => {
      db.close()
      const rows = (r.result as LocalImovelRecord[]).sort((a, b) => a.createdAt - b.createdAt)
      resolve(rows)
    }
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
