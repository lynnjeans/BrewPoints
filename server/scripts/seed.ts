import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { config } from '../src/config.js'
import {
  Customer,
  Redemption,
  Staff,
  StampTransaction,
  PushSubscription,
  connectDb,
  disconnectDb,
  nextId,
  mongoose,
} from '../src/db.js'
import { hashPassword } from '../src/auth/password.js'
import { reconcileBalance } from '../src/loyalty/balance.js'

// One-command dev seed (Dev Plan task 1.3). Re-runnable: it resets the collections first.
// Balances follow R2 — we write Earn transactions, then derive the cached balance from them.

function newQrSeed(): string {
  return randomBytes(32).toString('base64url')
}

async function earn(customerId: number, staffId: number, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    const transactionId = await nextId('stampTransaction')
    await StampTransaction.create({
      transactionId,
      customerId,
      staffId,
      stampValue: 1,
      transactionType: 'Earn',
      note: 'Seed stamp',
    })
  }
}

async function makeStaff(name: string, email: string, role: string, password: string) {
  const staffId = await nextId('staff')
  return Staff.create({ staffId, name, email, role, passwordHash: await hashPassword(password) })
}

async function makeCustomer(data: {
  name: string
  email: string
  phone?: string | null
  authProvider: string
  password?: string
}) {
  const customerId = await nextId('customer')
  return Customer.create({
    customerId,
    membershipId: `BP-${10000 + customerId}`,
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    authProvider: data.authProvider,
    passwordHash: data.password ? await hashPassword(data.password) : null,
    qrSeed: newQrSeed(),
  })
}

async function main(): Promise<void> {
  await connectDb(config.mongoUri)

  // Reset everything (collections + the id counters) for a clean, deterministic seed.
  await Promise.all([
    StampTransaction.deleteMany({}),
    Redemption.deleteMany({}),
    Customer.deleteMany({}),
    Staff.deleteMany({}),
    PushSubscription.deleteMany({}),
    mongoose.connection.collection('Counter').deleteMany({}),
  ])

  // Dev passwords (local only). Staff log in with email + password (Task 2.3).
  const sam = await makeStaff('Sam Barista', 'sam@brewpoints.local', 'staff', 'barista6')
  await makeStaff('Morgan Manager', 'morgan@brewpoints.local', 'manager', 'manager6')

  // Customer A — in progress (balance 6), email auth, has a phone. Dev login: coffee6
  const ana = await makeCustomer({
    name: 'Ana',
    email: 'ana@example.co.nz',
    phone: '021 555 0101',
    authProvider: 'email',
    password: 'coffee6',
  })
  await earn(ana.customerId, sam.staffId, 6)
  const anaBalance = await reconcileBalance(ana.customerId)

  // Customer B — reward ready (balance 10), google auth, no phone (OAuth-only, no email login).
  const ben = await makeCustomer({ name: 'Ben', email: 'ben@example.co.nz', authProvider: 'google' })
  await earn(ben.customerId, sam.staffId, 10)
  const benBalance = await reconcileBalance(ben.customerId)

  // Customer C — reward ready (balance 10), email auth. Dev login: coffee6
  const cara = await makeCustomer({
    name: 'Cara',
    email: 'cara@example.co.nz',
    authProvider: 'email',
    password: 'coffee6',
  })
  await earn(cara.customerId, sam.staffId, 10)
  await reconcileBalance(cara.customerId)

  // Read back and report.
  const staffCount = await Staff.countDocuments()
  const customers = await Customer.find()
    .select('name membershipId authProvider stampBalance')
    .sort({ membershipId: 1 })
    .lean()
  console.info(`Seeded ${staffCount} staff (dev login: sam@brewpoints.local / barista6).`)
  for (const c of customers) {
    console.info(`  ${c.membershipId} ${c.name} (${c.authProvider}) — balance ${c.stampBalance}`)
  }
  console.info(`Reconciled from transactions: Ana=${anaBalance}, Ben=${benBalance}`)
}

main()
  .then(() => disconnectDb())
  .catch(async (err: unknown) => {
    console.error(err)
    await disconnectDb()
    process.exitCode = 1
  })
