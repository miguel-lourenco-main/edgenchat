// Thin Promise wrappers around IndexedDB's callback-based API.
type IDBValue = unknown

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"))
  })
}

function promisifyTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"))
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"))
  })
}

// Opens (or upgrades) the database; onUpgrade runs inside onupgradeneeded.
export async function openDb(name: string, version: number, onUpgrade: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.")
  }

  const req = indexedDB.open(name, version)
  req.onupgradeneeded = () => {
    onUpgrade(req.result)
  }
  return await promisifyRequest(req)
}

// Read one record by primary key; undefined when missing.
export async function txGet<T = IDBValue>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return (await promisifyRequest(store.get(key))) as T | undefined
}

// Insert or overwrite a record (upsert by keyPath).
export async function txPut(store: IDBObjectStore, value: IDBValue): Promise<void> {
  await promisifyRequest(store.put(value))
}

// Remove one record by primary key.
export async function txDelete(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  await promisifyRequest(store.delete(key))
}

// Read every record in an object store.
export async function txGetAll<T = IDBValue>(store: IDBObjectStore): Promise<T[]> {
  return (await promisifyRequest(store.getAll())) as T[]
}

// Read records matching an index query (e.g. all messages for one chatId).
export async function txGetAllFromIndex<T = IDBValue>(
  index: IDBIndex,
  query?: IDBValidKey | IDBKeyRange | null,
): Promise<T[]> {
  return (await promisifyRequest(index.getAll(query ?? null))) as T[]
}

// Runs fn inside a transaction and waits for commit before resolving.
export async function runTx(db: IDBDatabase, storeNames: string | string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => Promise<void> | void) {
  const tx = db.transaction(storeNames, mode)
  await fn(tx)
  await promisifyTx(tx)
}


