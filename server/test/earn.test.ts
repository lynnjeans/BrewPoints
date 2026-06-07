import { describe, expect, it } from 'vitest'
import { Customer, StampTransaction } from '../src/db.js'
import { recalculateBalance } from '../src/loyalty/balance.js'
import { earnStamps, StampError } from '../src/loyalty/stamps.js'
import { makeCustomer, makeStaff } from './helpers.js'

async function setup() {
  const staff = await makeStaff({ email: 'sam@test.local' })
  const customer = await makeCustomer({ name: 'Ana', email: 'ana@test.local', membershipId: 'BP-30001', qrSeed: 'seed-30001' })
  return { staffId: staff.staffId, customerId: customer.customerId }
}

describe('earnStamps (Task 4.1)', () => {
  it('+1 adds one stamp and writes one Earn transaction', async () => {
    const { staffId, customerId } = await setup()
    const result = await earnStamps('BP-30001', staffId, 1)
    expect(result.stampBalance).toBe(1)
    expect(result.earned).toBe(1)

    const txns = await StampTransaction.find({ customerId }).lean()
    expect(txns).toHaveLength(1)
    expect(txns[0]?.transactionType).toBe('Earn')
    expect(txns[0]?.stampValue).toBe(1)
    expect(txns[0]?.staffId).toBe(staffId) // attributed to the staff
  })

  it('+2 in one call adds two and records a single transaction of value 2', async () => {
    const { staffId, customerId } = await setup()
    const result = await earnStamps('BP-30001', staffId, 2)
    expect(result.stampBalance).toBe(2)

    const txns = await StampTransaction.find({ customerId }).lean()
    expect(txns).toHaveLength(1)
    expect(txns[0]?.stampValue).toBe(2)
  })

  it('keeps the cache consistent with the transaction truth (R2)', async () => {
    const { staffId, customerId } = await setup()
    await earnStamps('BP-30001', staffId, 1)
    await earnStamps('BP-30001', staffId, 2)
    const cached = (await Customer.findOne({ customerId }).lean())!.stampBalance
    expect(cached).toBe(3)
    expect(await recalculateBalance(customerId)).toBe(3)
  })

  it('rejects an invalid stamp count', async () => {
    const { staffId } = await setup()
    await expect(earnStamps('BP-30001', staffId, 3)).rejects.toBeInstanceOf(StampError)
    await expect(earnStamps('BP-30001', staffId, 0)).rejects.toBeInstanceOf(StampError)
  })

  it('rejects an unknown membership id', async () => {
    const { staffId } = await setup()
    await expect(earnStamps('BP-99999', staffId, 1)).rejects.toBeInstanceOf(StampError)
  })
})

describe('earn idempotency (Task 4.4 — double-click protection)', () => {
  it('a double-submit with the same key creates only one transaction', async () => {
    const { staffId, customerId } = await setup()
    // Keys are unique per test — in production they are per-press UUIDs, never reused.
    const [a, b] = await Promise.all([
      earnStamps('BP-30001', staffId, 1, 'dbl-click-key'),
      earnStamps('BP-30001', staffId, 1, 'dbl-click-key'),
    ])
    expect(a.stampBalance).toBe(1)
    expect(b.stampBalance).toBe(1) // both see the same single result
    expect(await StampTransaction.countDocuments({ customerId })).toBe(1)
  })

  it('different keys are treated as separate presses', async () => {
    const { staffId, customerId } = await setup()
    await earnStamps('BP-30001', staffId, 1, 'press-A')
    await earnStamps('BP-30001', staffId, 1, 'press-B')
    expect(await StampTransaction.countDocuments({ customerId })).toBe(2)
  })
})
