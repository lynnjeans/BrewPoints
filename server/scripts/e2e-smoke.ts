import 'dotenv/config'
import { createHmac } from 'node:crypto'
import { config } from '../src/config.js'
import { Customer, Redemption, StampTransaction, connectDb, disconnectDb } from '../src/db.js'

// End-to-end smoke test (Task 7.4). Drives the full one-stage redemption storyboard over real HTTP,
// plus the three extra scenarios and the R1/R2/R3 red-line checks. Cleans up its own test customer.
// Requires the server running (default http://localhost:3001). Run: npm run smoke

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3001'
const GOAL = 10

// Same signing contract as client (Task 3.2) and server verifier (Task 3.3).
function sign(seed: string, membershipId: string, intent: 'earn' | 'redeem'): string {
  return createHmac('sha256', seed).update(`${membershipId}|${intent}`).digest('hex')
}

interface ApiResult {
  status: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

async function api(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {},
): Promise<ApiResult> {
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data: unknown = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

let passed = 0
function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`✗ FAILED: ${message}`)
  passed += 1
  console.info(`  ✓ ${message}`)
}

async function earnTo(staffToken: string, membershipId: string, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await api('/api/staff/earn', {
      method: 'POST',
      token: staffToken,
      body: { membershipId, stamps: 1 },
    })
  }
}

async function main(): Promise<void> {
  console.info(`E2E smoke against ${BASE}\n`)
  // Connect directly to the DB for the R2 truth check and cleanup (separate from the HTTP server).
  await connectDb(config.mongoUri)

  // Staff session
  const staffLogin = await api('/api/auth/staff/login', {
    method: 'POST',
    body: { email: 'sam@brewpoints.local', password: 'barista6' },
  })
  check(staffLogin.status === 200, 'staff signs in')
  const staffToken = staffLogin.data.token as string

  // --- Happy path ---
  console.info('\nHappy path:')
  const email = `smoke-${String(Date.now())}@example.co.nz`
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Smoke', email, password: 'secret6' },
  })
  check(reg.status === 201, 'customer registers')
  const custToken = reg.data.token as string
  const qrSeed = reg.data.qrSeed as string
  const membershipId = reg.data.customer.membershipId as string
  const customerId = reg.data.customer.customerId as number
  check(typeof qrSeed === 'string' && qrSeed.length > 20, 'login delivers qrSeed (3.1)')

  // Member code is computed locally (3.2) — no server call.
  const earnPayload = { membershipId, intent: 'earn' as const, signature: sign(qrSeed, membershipId, 'earn') }
  const scanEarn = await api('/api/staff/scan', { method: 'POST', token: staffToken, body: earnPayload })
  check(scanEarn.status === 200 && scanEarn.data.intent === 'earn', 'staff scan routes to earn')

  await earnTo(staffToken, membershipId, GOAL)
  let balance = (await api('/api/me', { token: custToken })).data.customer.stampBalance as number
  check(balance === GOAL, 'balance reaches 10 after +1 ×10')

  // Customer taps Redeem → local intent switch (3.2), no request.
  const redeemPayload = {
    membershipId,
    intent: 'redeem' as const,
    signature: sign(qrSeed, membershipId, 'redeem'),
  }
  check(redeemPayload.signature !== earnPayload.signature, 'redeem code differs from member code (local switch)')

  const scanRedeem = await api('/api/staff/scan', { method: 'POST', token: staffToken, body: redeemPayload })
  check(scanRedeem.status === 200 && scanRedeem.data.intent === 'redeem', 'staff scan routes to redeem')

  const redeem = await api('/api/staff/redeem', { method: 'POST', token: staffToken, body: { membershipId } })
  check(redeem.status === 200 && redeem.data.stampBalance === 0, 'staff confirms → balance 0')

  const txns = (await api('/api/me/transactions', { token: custToken })).data.transactions as {
    transactionType: string
    stampValue: number
  }[]
  check(
    txns.some((t) => t.transactionType === 'Redeem' && t.stampValue === -10),
    'history shows a −10 Redeem transaction',
  )
  const reds = (await api('/api/me/redemptions', { token: custToken })).data.redemptions as unknown[]
  check(reds.length === 1, 'one Redemption record exists')

  // --- Extra 1: offline redeem initiation ---
  console.info('\nExtra scenarios:')
  check(
    sign(qrSeed, membershipId, 'redeem') === redeemPayload.signature,
    'offline: redeem code is pure local HMAC (no network to switch)',
  )

  // --- Extra 2: screenshot forwarding (same code reused from "another device") ---
  await earnTo(staffToken, membershipId, GOAL)
  const fwdScan = await api('/api/staff/scan', { method: 'POST', token: staffToken, body: redeemPayload })
  check(fwdScan.status === 200 && fwdScan.data.intent === 'redeem', 'forwarded redeem code still verifies (R3 transfer allowed)')
  const fwdRedeem = await api('/api/staff/redeem', { method: 'POST', token: staffToken, body: { membershipId } })
  check(fwdRedeem.status === 200 && fwdRedeem.data.stampBalance === 0, 'forwarded redeem completes')

  // --- Extra 3: concurrent double-redeem ---
  await earnTo(staffToken, membershipId, GOAL)
  const [a, b] = await Promise.all([
    api('/api/staff/redeem', { method: 'POST', token: staffToken, body: { membershipId } }),
    api('/api/staff/redeem', { method: 'POST', token: staffToken, body: { membershipId } }),
  ])
  const successes = [a, b].filter((r) => r.status === 200).length
  check(successes === 1, 'concurrent double-redeem: exactly one succeeds')
  balance = (await api('/api/me', { token: custToken })).data.customer.stampBalance as number
  check(balance === 0, 'balance is 0 — never negative (R2 atomic conditional update)')

  // --- Red lines ---
  console.info('\nRed-line checks:')
  const r1 = await api('/api/staff/earn', { method: 'POST', token: custToken, body: { membershipId, stamps: 1 } })
  check(r1.status === 403, 'R1: customer token cannot add/deduct stamps (staff-only)')

  const sumAgg = await StampTransaction.aggregate<{ sum: number }>([
    { $match: { customerId } },
    { $group: { _id: null, sum: { $sum: '$stampValue' } } },
  ])
  const truth = sumAgg[0]?.sum ?? 0
  const cached = (await Customer.findOne({ customerId }).lean())!.stampBalance
  check(truth === cached, 'R2: cached balance equals sum of transactions (truth)')

  const tampered = { membershipId, intent: 'earn' as const, signature: `f${earnPayload.signature.slice(1)}` }
  const r3 = await api('/api/staff/scan', { method: 'POST', token: staffToken, body: tampered })
  check(r3.status === 400, 'R3: tampered signature is rejected')

  // Cleanup our test customer (leave seeded data untouched).
  await StampTransaction.deleteMany({ customerId })
  await Redemption.deleteMany({ customerId })
  await Customer.deleteMany({ customerId })

  console.info(`\n✅ ALL ${String(passed)} SMOKE CHECKS PASSED — test customer cleaned up.`)
}

main()
  .then(() => disconnectDb())
  .catch(async (err: unknown) => {
    console.error('\n', err)
    await disconnectDb()
    process.exitCode = 1
  })
