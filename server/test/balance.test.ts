import { describe, expect, it } from 'vitest'
import { Customer } from '../src/db.js'
import { getBalance, recalculateBalance, reconcileBalance, verifyBalance } from '../src/loyalty/balance.js'
import { addStamp, makeCustomer, makeStaff } from './helpers.js'

async function createCustomerAndStaff() {
  const staff = await makeStaff({ email: 'staff@test.local' })
  const customer = await makeCustomer({ email: 'cust@test.local', membershipId: 'BP-TEST', qrSeed: 'test-seed' })
  return { staffId: staff.staffId, customerId: customer.customerId }
}

describe('recalculateBalance (R2 source of truth)', () => {
  it('sums the signed stamp values (+1,+1,+1,-10 => -7)', async () => {
    const { customerId, staffId } = await createCustomerAndStaff()
    await addStamp(customerId, staffId, 1, 'Earn')
    await addStamp(customerId, staffId, 1, 'Earn')
    await addStamp(customerId, staffId, 1, 'Earn')
    await addStamp(customerId, staffId, -10, 'Redeem')
    expect(await recalculateBalance(customerId)).toBe(-7)
  })

  it('returns 0 for a customer with no transactions', async () => {
    const { customerId } = await createCustomerAndStaff()
    expect(await recalculateBalance(customerId)).toBe(0)
  })

  it('handles a realistic earn-then-redeem cycle (10x +1 then -10 => 0)', async () => {
    const { customerId, staffId } = await createCustomerAndStaff()
    for (let i = 0; i < 10; i++) await addStamp(customerId, staffId, 1, 'Earn')
    await addStamp(customerId, staffId, -10, 'Redeem')
    expect(await recalculateBalance(customerId)).toBe(0)
  })
})

describe('verifyBalance / reconcileBalance (cache consistency)', () => {
  it('detects a tampered cache and reconcile repairs it', async () => {
    const { customerId, staffId } = await createCustomerAndStaff()
    await addStamp(customerId, staffId, 1, 'Earn')
    await addStamp(customerId, staffId, 1, 'Earn')
    await addStamp(customerId, staffId, 1, 'Earn')

    // Tamper the cached balance directly (truth from transactions is 3).
    await Customer.updateOne({ customerId }, { $set: { stampBalance: 99 } })

    const before = await verifyBalance(customerId)
    expect(before.cached).toBe(99)
    expect(before.recalculated).toBe(3)
    expect(before.consistent).toBe(false)

    const fixed = await reconcileBalance(customerId)
    expect(fixed).toBe(3)

    const after = await verifyBalance(customerId)
    expect(after.consistent).toBe(true)
    expect(after.cached).toBe(3)
    expect(await getBalance(customerId)).toBe(3)
  })
})
