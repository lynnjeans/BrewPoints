import mongoose, { Schema, type ClientSession, type Model } from 'mongoose'

// MongoDB / Mongoose data layer (migrated from Prisma/SQLite to satisfy the NoSQL requirement).
//
// Design notes:
// - We keep the original integer surrogate keys (customerId, staffId, transactionId, redemptionId)
//   via a Counters collection (auto-increment emulation). This preserves the entire app contract
//   that predates this migration: JWT `sub` is numeric, membership ids are `BP-${10000+customerId}`,
//   and every route/test still passes plain numbers around. Mongo's own _id (ObjectId) is retained.
// - R2 (atomic conditional deduction + Redeem txn + Redemption in ONE transaction) is preserved with
//   a Mongoose session/transaction (see withTransaction + redeem.ts). Multi-document transactions
//   require MongoDB to run as a REPLICA SET — Atlas is one by default; for local dev run a
//   single-node replica set (see server/DB_SETUP.md). Tests use an in-memory replica set.
// - qrSeed is stored server-side only (R3) and never leaves in a QR payload.

// ---------------------------------------------------------------------------
// Document interfaces
// ---------------------------------------------------------------------------

export interface CustomerDoc {
  customerId: number
  name: string
  email: string
  phone: string | null
  authProvider: string // "google" | "email"
  passwordHash: string | null // null for google accounts
  stampBalance: number // cache; truth = sum(StampTransaction) (R2)
  membershipId: string // e.g. "BP-10001"
  qrSeed: string // server-only HMAC key (R3); never in a QR payload
  createdAt: Date
}

export interface StaffDoc {
  staffId: number
  name: string
  email: string
  passwordHash: string | null
  role: string // "staff" | "manager"
  createdAt: Date
}

export interface RedemptionDoc {
  redemptionId: number
  customerId: number
  staffId: number
  rewardName: string
  stampsUsed: number
  redeemedAt: Date
}

export interface StampTransactionDoc {
  transactionId: number
  customerId: number
  staffId: number
  stampValue: number // signed: +1/+2 (Earn), -10 (Redeem)
  transactionType: string // "Earn" | "Redeem" | "Adjustment"
  note: string | null
  createdAt: Date
}

export interface PushSubscriptionDoc {
  customerId: number
  endpoint: string
  keys: { p256dh: string; auth: string }
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const customerSchema = new Schema<CustomerDoc>({
  customerId: { type: Number, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: null },
  authProvider: { type: String, required: true },
  passwordHash: { type: String, default: null },
  stampBalance: { type: Number, default: 0 },
  membershipId: { type: String, required: true, unique: true },
  qrSeed: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
})

const staffSchema = new Schema<StaffDoc>({
  staffId: { type: Number, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, default: null },
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

const redemptionSchema = new Schema<RedemptionDoc>({
  redemptionId: { type: Number, unique: true, index: true },
  customerId: { type: Number, required: true, index: true },
  staffId: { type: Number, required: true },
  rewardName: { type: String, required: true },
  stampsUsed: { type: Number, required: true },
  redeemedAt: { type: Date, default: Date.now },
})

const stampTransactionSchema = new Schema<StampTransactionDoc>({
  transactionId: { type: Number, unique: true, index: true },
  customerId: { type: Number, required: true, index: true },
  staffId: { type: Number, required: true },
  stampValue: { type: Number, required: true },
  transactionType: { type: String, required: true },
  note: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
})

const pushSubscriptionSchema = new Schema<PushSubscriptionDoc>({
  customerId: { type: Number, required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now },
})

interface CounterDoc {
  _id: string
  seq: number
}
const counterSchema = new Schema<CounterDoc>({
  _id: { type: String },
  seq: { type: Number, default: 0 },
})

// ---------------------------------------------------------------------------
// Models (collection names match the original PascalCase table names)
// ---------------------------------------------------------------------------

export const Customer: Model<CustomerDoc> =
  mongoose.models.Customer ?? mongoose.model<CustomerDoc>('Customer', customerSchema, 'Customer')
export const Staff: Model<StaffDoc> =
  mongoose.models.Staff ?? mongoose.model<StaffDoc>('Staff', staffSchema, 'Staff')
export const Redemption: Model<RedemptionDoc> =
  mongoose.models.Redemption ??
  mongoose.model<RedemptionDoc>('Redemption', redemptionSchema, 'Redemption')
export const StampTransaction: Model<StampTransactionDoc> =
  mongoose.models.StampTransaction ??
  mongoose.model<StampTransactionDoc>('StampTransaction', stampTransactionSchema, 'StampTransaction')
export const PushSubscription: Model<PushSubscriptionDoc> =
  mongoose.models.PushSubscription ??
  mongoose.model<PushSubscriptionDoc>('PushSubscription', pushSubscriptionSchema, 'PushSubscription')
const Counter: Model<CounterDoc> =
  mongoose.models.Counter ?? mongoose.model<CounterDoc>('Counter', counterSchema, 'Counter')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Atomic auto-increment for the integer surrogate keys. Pass a session to enlist in a transaction. */
export async function nextId(name: string, session?: ClientSession): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  )
  return doc.seq
}

/**
 * Run `fn` inside a MongoDB multi-document transaction (R2). Requires a replica set.
 * Throwing inside `fn` aborts the transaction (no partial writes) and re-throws to the caller.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession()
  try {
    let result: T
    await session.withTransaction(async () => {
      result = await fn(session)
    })
    return result!
  } finally {
    await session.endSession()
  }
}

let connecting: Promise<typeof mongoose> | null = null

/** Connect once (idempotent). Safe to call from server startup, seed scripts, and tests. */
export async function connectDb(uri: string): Promise<void> {
  if (mongoose.connection.readyState === 1) return
  if (!connecting) connecting = mongoose.connect(uri)
  await connecting
}

export async function disconnectDb(): Promise<void> {
  connecting = null
  await mongoose.disconnect()
}

export { mongoose }
