import { Redemption, StampTransaction } from '../db.js'

export interface TransactionEntry {
  transactionId: number
  stampValue: number
  transactionType: string
  note: string | null
  createdAt: Date
}

// All stamp movements for a customer, newest first (PDR 8.7 / 14.5).
export async function getTransactions(customerId: number): Promise<TransactionEntry[]> {
  const rows = await StampTransaction.find({ customerId })
    .sort({ createdAt: -1, transactionId: -1 })
    .select('transactionId stampValue transactionType note createdAt')
    .lean()
  return rows.map((r) => ({
    transactionId: r.transactionId,
    stampValue: r.stampValue,
    transactionType: r.transactionType,
    note: r.note,
    createdAt: r.createdAt,
  }))
}

export interface RedemptionEntry {
  redemptionId: number
  rewardName: string
  stampsUsed: number
  redeemedAt: Date
}

// Reward redemptions for a customer, newest first (PDR 14.3 "Your shouts so far").
export async function getRedemptions(customerId: number): Promise<RedemptionEntry[]> {
  const rows = await Redemption.find({ customerId })
    .sort({ redeemedAt: -1, redemptionId: -1 })
    .select('redemptionId rewardName stampsUsed redeemedAt')
    .lean()
  return rows.map((r) => ({
    redemptionId: r.redemptionId,
    rewardName: r.rewardName,
    stampsUsed: r.stampsUsed,
    redeemedAt: r.redeemedAt,
  }))
}
