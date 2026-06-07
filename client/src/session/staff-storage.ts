import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Staff session is separate from the customer session (different login, different token, no qrSeed),
// so it lives in its own IndexedDB database.
export interface StaffSession {
  token: string
  staff: { staffId: number; name: string; email: string; role: string }
}

interface StaffDB extends DBSchema {
  session: { key: string; value: StaffSession }
}

const STORE = 'session'
const KEY = 'current'

let dbPromise: Promise<IDBPDatabase<StaffDB>> | null = null

function db(): Promise<IDBPDatabase<StaffDB>> {
  dbPromise ??= openDB<StaffDB>('brewpoints-staff', 1, {
    upgrade(database) {
      database.createObjectStore(STORE)
    },
  })
  return dbPromise
}

export async function saveStaffSession(session: StaffSession): Promise<void> {
  await (await db()).put(STORE, session, KEY)
}

export async function loadStaffSession(): Promise<StaffSession | undefined> {
  return (await db()).get(STORE, KEY)
}

export async function clearStaffSession(): Promise<void> {
  await (await db()).delete(STORE, KEY)
}
