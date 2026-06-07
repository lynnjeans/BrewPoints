import { config } from '../config.js'
import { Customer, Redemption, StampTransaction, nextId, withTransaction } from '../db.js'
import { StampError } from './stamps.js'

// R1: this is the ONLY place stamps are deducted, and it runs only on staff confirmation.
// R2: the deduction uses an ATOMIC CONDITIONAL update (never read-then-write), and the
// deduction + Redeem transaction + Redemption record all commit in ONE transaction.

const REWARD_NAME = 'Free regular coffee' // sentence case (Appendix D.5/D.8), not Title Case

export interface RedeemResult {
  redemptionId: number
  customerId: number
  customerName: string
  stampBalance: number
  stampsUsed: number
}

export async function redeemReward(membershipId: string, staffId: number): Promise<RedeemResult> {
  const threshold = config.stampsForFreeCoffee

  const customer = await Customer.findOne({ membershipId }).select('customerId name').lean()
  if (!customer) throw new StampError(404, 'No customer found for that code.')

  const result = await withTransaction(async (session) => {
    // Atomic conditional deduction: decrement ONLY if balance is still >= threshold.
    // A non-null result means we won the race; null means insufficient (or someone else just
    // spent it). This is the Mongo equivalent of `UPDATE ... WHERE balance >= 10` (R2) — there is
    // never a read-then-write gap, so concurrent confirms can never drive the balance below 0.
    const updated = await Customer.findOneAndUpdate(
      { customerId: customer.customerId, stampBalance: { $gte: threshold } },
      { $inc: { stampBalance: -threshold } },
      { new: true, session },
    ).select('stampBalance')

    if (!updated) {
      const current = await Customer.findOne({ customerId: customer.customerId })
        .select('stampBalance')
        .session(session)
      const needed = threshold - (current?.stampBalance ?? 0)
      // Throwing aborts the whole transaction → no records written.
      throw new StampError(409, `Not quite there yet. ${needed} more stamps needed for a free coffee.`)
    }

    const transactionId = await nextId('stampTransaction', session)
    await StampTransaction.create(
      [
        {
          transactionId,
          customerId: customer.customerId,
          staffId,
          stampValue: -threshold,
          transactionType: 'Redeem',
          note: REWARD_NAME,
        },
      ],
      { session },
    )

    const redemptionId = await nextId('redemption', session)
    await Redemption.create(
      [
        {
          redemptionId,
          customerId: customer.customerId,
          staffId,
          rewardName: REWARD_NAME,
          stampsUsed: threshold,
        },
      ],
      { session },
    )

    return { redemptionId, stampBalance: updated.stampBalance }
  })

  return {
    redemptionId: result.redemptionId,
    customerId: customer.customerId,
    customerName: customer.name,
    stampBalance: result.stampBalance,
    stampsUsed: threshold,
  }
}
