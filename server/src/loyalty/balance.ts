import { Customer, StampTransaction } from '../db.js'

// R2: StampTransaction is the authoritative source of truth for a customer's balance.
// Customer.stampBalance is only a cache. These helpers recompute the truth and let us
// detect / repair a stale or tampered cache.

/** Authoritative balance = sum of all signed StampValue rows for the customer. */
export async function recalculateBalance(customerId: number): Promise<number> {
  const result = await StampTransaction.aggregate<{ sum: number }>([
    { $match: { customerId } },
    { $group: { _id: null, sum: { $sum: '$stampValue' } } },
  ])
  return result[0]?.sum ?? 0
}

/** Fast read of the cached balance (Customer.stampBalance). May be stale — use verifyBalance to check. */
export async function getBalance(customerId: number): Promise<number> {
  const customer = await Customer.findOne({ customerId }).select('stampBalance').lean()
  if (!customer) throw new Error(`No customer ${customerId}`)
  return customer.stampBalance
}

export interface BalanceCheck {
  customerId: number
  cached: number
  recalculated: number
  consistent: boolean
}

/** Compare the cached balance against the recomputed truth without modifying anything. */
export async function verifyBalance(customerId: number): Promise<BalanceCheck> {
  const [cached, recalculated] = await Promise.all([
    getBalance(customerId),
    recalculateBalance(customerId),
  ])
  return { customerId, cached, recalculated, consistent: cached === recalculated }
}

/** Repair the cache: set Customer.stampBalance to the recomputed truth. Returns the corrected value. */
export async function reconcileBalance(customerId: number): Promise<number> {
  const recalculated = await recalculateBalance(customerId)
  await Customer.updateOne({ customerId }, { $set: { stampBalance: recalculated } })
  return recalculated
}
