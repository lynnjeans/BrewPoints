import { describe, expect, it } from 'vitest'
import { Customer, Redemption, Staff, StampTransaction } from '../src/db.js'
import { recalculateBalance } from '../src/loyalty/balance.js'
import { redeemReward } from '../src/loyalty/redeem.js'
import { StampError } from '../src/loyalty/stamps.js'
import { addEarns, makeCustomer, makeStaff } from './helpers.js'

const MEMBER = 'BP-40001'

// R2-consistent setup: write `total` Earn transactions AND set the cache to match.
async function setupWithBalance(total: number) {
  const staff = await makeStaff({ email: 'sam@test.local' })
  const customer = await makeCustomer({ name: 'Ben', email: 'ben@test.local', membershipId: MEMBER, qrSeed: 'seed-40001' })
  await addEarns(customer.customerId, staff.staffId, total)
  return { staffId: staff.staffId, customerId: customer.customerId }
}

describe('redeemReward (Task 4.3 — R1/R2)', () => {
  it('at exactly 10: balance→0, one Redeem txn + one Redemption, all consistent', async () => {
    const { customerId } = await setupWithBalance(10)
    const result = await redeemReward(MEMBER, await firstStaffId())
    expect(result.stampBalance).toBe(0)
    expect(result.stampsUsed).toBe(10)
    expect(result.redemptionId).toBeGreaterThan(0)

    const redeemTxns = await StampTransaction.find({ transactionType: 'Redeem' }).lean()
    expect(redeemTxns).toHaveLength(1)
    expect(redeemTxns[0]?.stampValue).toBe(-10)
    expect(await Redemption.countDocuments()).toBe(1)
    // R2: cache matches recomputed truth (10 earns + 1 redeem of -10 = 0).
    expect(await recalculateBalance(customerId)).toBe(0)
  })

  it('at 9: rejected with no writes at all', async () => {
    await setupWithBalance(9)
    await expect(redeemReward(MEMBER, await firstStaffId())).rejects.toBeInstanceOf(StampError)
    expect(await StampTransaction.countDocuments({ transactionType: 'Redeem' })).toBe(0)
    expect(await Redemption.countDocuments()).toBe(0)
    const balance = (await Customer.findOne({ membershipId: MEMBER }).lean())!.stampBalance
    expect(balance).toBe(9) // untouched
  })

  it('concurrent double-redeem at 10: exactly one succeeds, balance ends at 0 (never -10)', async () => {
    await setupWithBalance(10)
    const staffId = await firstStaffId()
    const settled = await Promise.allSettled([
      redeemReward(MEMBER, staffId),
      redeemReward(MEMBER, staffId),
    ])
    const fulfilled = settled.filter((r) => r.status === 'fulfilled')
    const rejected = settled.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const balance = (await Customer.findOne({ membershipId: MEMBER }).lean())!.stampBalance
    expect(balance).toBe(0) // never -10
    expect(await StampTransaction.countDocuments({ transactionType: 'Redeem' })).toBe(1)
    expect(await Redemption.countDocuments()).toBe(1)
  })

  it('balance 30: three redeems succeed, the fourth is rejected, ending at 0', async () => {
    await setupWithBalance(30)
    const staffId = await firstStaffId()
    expect((await redeemReward(MEMBER, staffId)).stampBalance).toBe(20)
    expect((await redeemReward(MEMBER, staffId)).stampBalance).toBe(10)
    expect((await redeemReward(MEMBER, staffId)).stampBalance).toBe(0)
    await expect(redeemReward(MEMBER, staffId)).rejects.toBeInstanceOf(StampError)

    const balance = (await Customer.findOne({ membershipId: MEMBER }).lean())!.stampBalance
    expect(balance).toBe(0)
    expect(await Redemption.countDocuments()).toBe(3)
  })

  it('rejects an unknown membership id', async () => {
    await expect(redeemReward('BP-NOPE', 1)).rejects.toBeInstanceOf(StampError)
  })
})

async function firstStaffId(): Promise<number> {
  const staff = await Staff.findOne().lean()
  if (!staff) throw new Error('no staff seeded')
  return staff.staffId
}
