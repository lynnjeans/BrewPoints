import { describe, expect, it } from 'vitest'
import { Customer } from '../src/db.js'
import { earnStamps } from '../src/loyalty/stamps.js'
import { redeemReward } from '../src/loyalty/redeem.js'
import { getRedemptions, getTransactions } from '../src/loyalty/history.js'
import { addEarns, makeCustomer, makeStaff } from './helpers.js'

async function setup() {
  const staff = await makeStaff({ email: 'sam@test.local' })
  const customer = await makeCustomer({ name: 'Ana', email: 'ana@test.local', membershipId: 'BP-50001', qrSeed: 'seed-50001' })
  return { staffId: staff.staffId, customerId: customer.customerId }
}

describe('getTransactions (Task 4.5)', () => {
  it('returns the customer transactions with type, value and time, newest first', async () => {
    const { staffId } = await setup()
    await earnStamps('BP-50001', staffId, 1)
    await earnStamps('BP-50001', staffId, 2)
    const txns = await getTransactions(await currentCustomerId())
    expect(txns).toHaveLength(2)
    // newest first
    expect(txns[0]?.stampValue).toBe(2)
    expect(txns[1]?.stampValue).toBe(1)
    expect(txns[0]?.transactionType).toBe('Earn')
    expect(txns[0]?.createdAt).toBeInstanceOf(Date)
  })

  it('includes the Redeem (-10) transaction after a redemption', async () => {
    const { staffId, customerId } = await setup()
    await addEarns(customerId, staffId, 10) // bring to 10
    await redeemReward('BP-50001', staffId)

    const txns = await getTransactions(customerId)
    expect(txns[0]?.transactionType).toBe('Redeem') // newest
    expect(txns[0]?.stampValue).toBe(-10)
  })

  it('only returns the requesting customer’s own transactions', async () => {
    const { staffId, customerId } = await setup()
    await earnStamps('BP-50001', staffId, 1)
    const other = await makeCustomer({ name: 'Ben', email: 'ben@test.local', membershipId: 'BP-50002', qrSeed: 'seed-50002' })
    await earnStamps('BP-50002', staffId, 2)

    expect(await getTransactions(customerId)).toHaveLength(1)
    expect(await getTransactions(other.customerId)).toHaveLength(1)
  })
})

describe('getRedemptions (Task 4.5)', () => {
  it('returns the redemption history', async () => {
    const { staffId, customerId } = await setup()
    await addEarns(customerId, staffId, 10)
    await redeemReward('BP-50001', staffId)

    const redemptions = await getRedemptions(customerId)
    expect(redemptions).toHaveLength(1)
    expect(redemptions[0]?.rewardName).toBe('Free regular coffee')
    expect(redemptions[0]?.stampsUsed).toBe(10)
    expect(redemptions[0]?.redeemedAt).toBeInstanceOf(Date)
  })

  it('returns an empty list when the customer has never redeemed', async () => {
    const { customerId } = await setup()
    expect(await getRedemptions(customerId)).toEqual([])
  })
})

async function currentCustomerId(): Promise<number> {
  const c = await Customer.findOne({ membershipId: 'BP-50001' }).lean()
  if (!c) throw new Error('customer not found')
  return c.customerId
}
