import { Customer, StampTransaction, nextId, withTransaction } from '../db.js'

// Carries an HTTP status so the route can map failures to responses.
export class StampError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'StampError'
  }
}

export interface EarnResult {
  customerId: number
  customerName: string
  stampBalance: number
  earned: number
}

// In-flight de-duplication for double-submits (Task 4.4). A client sends one idempotencyKey per
// intended button press; a fast double-click (or retry) reuses the SAME key, so concurrent/repeat
// requests share one in-flight Promise → exactly one Earn transaction. In-memory is sufficient for
// this single-instance app; the staff +1 button also has a UI cooldown (Task 6.1, defence in depth).
const IDEMPOTENCY_TTL_MS = 10_000
const inFlight = new Map<string, Promise<EarnResult>>()

export function earnStamps(
  membershipId: string,
  staffId: number,
  stamps: number,
  idempotencyKey?: string,
): Promise<EarnResult> {
  if (idempotencyKey === undefined || idempotencyKey === '') {
    return earnStampsOnce(membershipId, staffId, stamps)
  }
  const existing = inFlight.get(idempotencyKey)
  if (existing) return existing

  const key = idempotencyKey
  const pending = earnStampsOnce(membershipId, staffId, stamps)
  inFlight.set(key, pending)
  // Keep the result briefly after it settles so a slightly-delayed duplicate still de-dupes,
  // then drop it (each new user action uses a fresh key, so this only bounds memory).
  void pending
    .finally(() => {
      setTimeout(() => inFlight.delete(key), IDEMPOTENCY_TTL_MS)
    })
    .catch(() => {
      /* the caller handles the rejection on the returned promise */
    })
  return pending
}

// Add 1 or 2 stamps for a customer (PDR 8.4/8.5, User Story 2).
// R2: writes the Earn StampTransaction (source of truth) AND updates the cached balance in the
// SAME transaction, so the two never diverge. Earn uses $inc (no lower-bound race) — the atomic
// conditional update is only needed for redeem deduction (Task 4.3).
async function earnStampsOnce(
  membershipId: string,
  staffId: number,
  stamps: number,
): Promise<EarnResult> {
  if (stamps !== 1 && stamps !== 2) {
    throw new StampError(400, 'You can add 1 or 2 stamps.')
  }

  const customer = await Customer.findOne({ membershipId }).select('customerId name').lean()
  if (!customer) throw new StampError(404, 'No customer found for that code.')

  const stampBalance = await withTransaction(async (session) => {
    const transactionId = await nextId('stampTransaction', session)
    await StampTransaction.create(
      [
        {
          transactionId,
          customerId: customer.customerId,
          staffId,
          stampValue: stamps,
          transactionType: 'Earn',
          note: null,
        },
      ],
      { session },
    )
    const updated = await Customer.findOneAndUpdate(
      { customerId: customer.customerId },
      { $inc: { stampBalance: stamps } },
      { new: true, session },
    ).select('stampBalance')
    return updated!.stampBalance
  })

  return {
    customerId: customer.customerId,
    customerName: customer.name,
    stampBalance,
    earned: stamps,
  }
}
