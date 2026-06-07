import { createHmac, timingSafeEqual } from 'node:crypto'
import { Customer } from '../db.js'

export type QrIntent = 'earn' | 'redeem'

export interface ScanSuccess {
  ok: true
  customerName: string
  stampBalance: number
  intent: QrIntent
  memberSince: string
}
export interface ScanFailure {
  ok: false
}
export type ScanResult = ScanSuccess | ScanFailure

const FAIL: ScanFailure = { ok: false }

// Mirrors the client signing contract EXACTLY (Task 3.2):
//   HMAC-SHA256, key = UTF-8(qrSeed), message = `${membershipId}|${intent}`, output = lowercase hex.
export function computeServerSignature(
  qrSeed: string,
  membershipId: string,
  intent: QrIntent,
): string {
  return createHmac('sha256', qrSeed).update(`${membershipId}|${intent}`).digest('hex')
}

// Constant-time comparison (R3): never use === on the signature (timing attack).
function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  // timingSafeEqual throws on length mismatch; a length difference already means "not equal".
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function isIntent(value: unknown): value is QrIntent {
  return value === 'earn' || value === 'redeem'
}

// Verifies a scanned QR payload. The ONLY checks are: signature authenticity (recompute with the
// customer's server-side seed) + the customer exists. NO time-window, NO replay/used-token tracking
// (R3 — forwarding is allowed by design). Balance sufficiency for redeem is enforced later at the
// atomic deduction step (Task 4.3), not here.
export async function verifyScan(payload: unknown): Promise<ScanResult> {
  if (typeof payload !== 'object' || payload === null) return FAIL
  const { membershipId, intent, signature } = payload as Record<string, unknown>
  if (typeof membershipId !== 'string' || typeof signature !== 'string' || !isIntent(intent)) {
    return FAIL
  }

  const customer = await Customer.findOne({ membershipId })
    .select('name stampBalance qrSeed createdAt')
    .lean()
  // Unknown member → same generic failure (no enumeration, no info leak).
  if (!customer) return FAIL

  const expected = computeServerSignature(customer.qrSeed, membershipId, intent)
  if (!constantTimeEqual(expected, signature)) return FAIL

  return {
    ok: true,
    customerName: customer.name,
    stampBalance: customer.stampBalance,
    intent,
    memberSince: customer.createdAt.toISOString(),
  }
}
