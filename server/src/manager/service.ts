import { Customer, Redemption, Staff, StampTransaction } from '../db.js'

const RECENT_LIMIT = 100

// Read-only store overview for managers (PDR 5.3, Task 7.3): customer loyalty info,
// recent stamp transactions, and redemption records — all customers.
//
// Mongo has no joins, so we fetch the recent rows then resolve the referenced customer/staff
// names with two batched lookups (small, bounded sets) and build the same shape the UI expects.
export async function getManagerOverview() {
  const [customers, txnRows, redemptionRows] = await Promise.all([
    Customer.find()
      .select('customerId name email membershipId authProvider stampBalance createdAt')
      .sort({ membershipId: 1 })
      .lean(),
    StampTransaction.find()
      .select('transactionId stampValue transactionType createdAt customerId staffId')
      .sort({ createdAt: -1, transactionId: -1 })
      .limit(RECENT_LIMIT)
      .lean(),
    Redemption.find()
      .select('redemptionId rewardName stampsUsed redeemedAt customerId staffId')
      .sort({ redeemedAt: -1, redemptionId: -1 })
      .limit(RECENT_LIMIT)
      .lean(),
  ])

  // Batched name resolution for the referenced customers/staff.
  const customerIds = new Set<number>([...txnRows, ...redemptionRows].map((r) => r.customerId))
  const staffIds = new Set<number>([...txnRows, ...redemptionRows].map((r) => r.staffId))
  const [refCustomers, refStaff] = await Promise.all([
    Customer.find({ customerId: { $in: [...customerIds] } })
      .select('customerId name membershipId')
      .lean(),
    Staff.find({ staffId: { $in: [...staffIds] } })
      .select('staffId name')
      .lean(),
  ])
  const customerById = new Map(refCustomers.map((c) => [c.customerId, c]))
  const staffById = new Map(refStaff.map((s) => [s.staffId, s]))

  const transactions = txnRows.map((t) => ({
    transactionId: t.transactionId,
    stampValue: t.stampValue,
    transactionType: t.transactionType,
    createdAt: t.createdAt,
    customer: {
      name: customerById.get(t.customerId)?.name ?? '—',
      membershipId: customerById.get(t.customerId)?.membershipId ?? '—',
    },
    staff: { name: staffById.get(t.staffId)?.name ?? '—' },
  }))

  const redemptions = redemptionRows.map((r) => ({
    redemptionId: r.redemptionId,
    rewardName: r.rewardName,
    stampsUsed: r.stampsUsed,
    redeemedAt: r.redeemedAt,
    customer: {
      name: customerById.get(r.customerId)?.name ?? '—',
      membershipId: customerById.get(r.customerId)?.membershipId ?? '—',
    },
    staff: { name: staffById.get(r.staffId)?.name ?? '—' },
  }))

  return { customers, transactions, redemptions }
}
