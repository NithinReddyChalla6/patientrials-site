/**
 * Consent documents, held on this device.
 *
 * Deliberately not part of the site record. The whole site state is one JSON
 * document that is rewritten and re-uploaded on every save anywhere in the app,
 * so a one-megabyte PDF sitting inside it would be posted again each time
 * somebody edited a participant. What the record keeps is where the fields sit
 * — a few hundred bytes. The file itself lives here, in this browser, and if it
 * is not here the designer asks for it back in a click.
 *
 * IndexedDB rather than localStorage because it stores a Blob as a Blob. The
 * same file base64-encoded into localStorage grows by a third and competes for
 * a five-megabyte budget shared with everything else the app remembers.
 */

const DB_NAME = 'patientrials-documents'
const STORE = 'consent-documents'

export interface StoredDocument {
  name: string
  type: string
  blob: Blob
}

/**
 * Every path through this module resolves rather than rejects.
 *
 * A browser in private mode, or one told to block site data, refuses to open
 * IndexedDB at all. That is a reason for the designer to ask for the file
 * again, not a reason for the screen to fail.
 */
function openDb(): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.addEventListener('upgradeneeded', () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      })
      request.addEventListener('success', () => resolve(request.result))
      request.addEventListener('error', () => resolve(undefined))
      request.addEventListener('blocked', () => resolve(undefined))
    } catch {
      resolve(undefined)
    }
  })
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) {
          resolve(undefined)
          return
        }
        try {
          const tx = db.transaction(STORE, mode)
          const request = action(tx.objectStore(STORE))
          request.addEventListener('success', () => resolve(request.result))
          request.addEventListener('error', () => resolve(undefined))
          tx.addEventListener('complete', () => db.close())
        } catch {
          resolve(undefined)
        }
      }),
  )
}

/** Keep the document for `key`, replacing whatever was there. */
export async function saveDocument(key: string, file: File): Promise<void> {
  const record: StoredDocument = { name: file.name, type: file.type, blob: file }
  await run('readwrite', (store) => store.put(record, key))
}

export async function loadDocument(key: string): Promise<StoredDocument | undefined> {
  const record = await run<StoredDocument>('readonly', (store) => store.get(key))
  // Written by an older shape, or by nothing at all.
  return record && record.blob instanceof Blob ? record : undefined
}

export async function forgetDocument(key: string): Promise<void> {
  await run('readwrite', (store) => store.delete(key))
}
