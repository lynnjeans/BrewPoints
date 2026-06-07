import { Customer, Staff, StampTransaction, nextId } from '../src/db.js'

// Shared fixtures for the Mongoose-backed tests. Each create() allocates the integer surrogate
// key from the same Counters collection the app uses, so test data looks exactly like real data.

export async function makeStaff(
  overrides: Partial<{ name: string; email: string; role: string; passwordHash: string | null }> = {},
) {
  const staffId = await nextId('staff')
  return Staff.create({
    staffId,
    name: 'Sam',
    email: `staff-${staffId}@test.local`,
    role: 'staff',
    passwordHash: 'x',
    ...overrides,
  })
}

export async function makeCustomer(
  overrides: Partial<{
    name: string
    email: string
    phone: string | null
    authProvider: string
    passwordHash: string | null
    membershipId: string
    qrSeed: string
    stampBalance: number
  }> = {},
) {
  const customerId = await nextId('customer')
  return Customer.create({
    customerId,
    name: 'Cust',
    email: `cust-${customerId}@test.local`,
    authProvider: 'email',
    membershipId: `BP-${10000 + customerId}`,
    qrSeed: `seed-${customerId}`,
    ...overrides,
  })
}

/** Write `count` Earn (+1) transactions and bump the cached balance to match (R2-consistent). */
export async function addEarns(customerId: number, staffId: number, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const transactionId = await nextId('stampTransaction')
    await StampTransaction.create({
      transactionId,
      customerId,
      staffId,
      stampValue: 1,
      transactionType: 'Earn',
    })
  }
  if (count > 0) {
    await Customer.updateOne({ customerId }, { $inc: { stampBalance: count } })
  }
}

/** Write a single signed transaction (used by balance tests for mixed +/− sequences). */
export async function addStamp(
  customerId: number,
  staffId: number,
  stampValue: number,
  type = 'Earn',
): Promise<void> {
  const transactionId = await nextId('stampTransaction')
  await StampTransaction.create({
    transactionId,
    customerId,
    staffId,
    stampValue,
    transactionType: type,
  })
}
