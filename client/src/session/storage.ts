import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Persisted client session. The qrSeed lives here so the member QR works fully offline
// (Task 3.2): once stored after login, no network is needed to display or switch codes.
export interface SessionCustomer {
  customerId: number
  name: string
  email: string
  phone: string | null
  membershipId: string
  authProvider: string
  stampBalance: number
}

export interface Session {
  token: string
  qrSeed: string
  customer: SessionCustomer
}

interface BrewDB extends DBSchema {
  session: { key: string; value: Session }
}

const STORE = 'session'
const KEY = 'current'

let dbPromise: Promise<IDBPDatabase<BrewDB>> | null = null

function db(): Promise<IDBPDatabase<BrewDB>> {
  dbPromise ??= openDB<BrewDB>('brewpoints', 1, {
    upgrade(database) {
      database.createObjectStore(STORE)
    },
  })
  return dbPromise
}

export async function saveSession(session: Session): Promise<void> {
  await (await db()).put(STORE, session, KEY)
}

export async function loadSession(): Promise<Session | undefined> {
  return (await db()).get(STORE, KEY)
}

export async function clearSession(): Promise<void> {
  await (await db()).delete(STORE, KEY)
}
