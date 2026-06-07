import { describe, expect, it } from 'vitest'
import { computeServerSignature, verifyScan } from '../src/qr/verify.js'
import { makeCustomer } from './helpers.js'

const SEED = 'cust-seed-xyz'

async function makeScanCustomer(membershipId: string, stampBalance = 6) {
  return makeCustomer({
    name: 'Scan Target',
    email: `${membershipId}@test.local`,
    membershipId,
    qrSeed: SEED,
    stampBalance,
  })
}

describe('computeServerSignature', () => {
  it('matches the reference vector locked by the client (Task 3.2)', () => {
    // Same vector as client/src/qr/signature.test.ts — proves client & server agree.
    expect(computeServerSignature('test-seed-abc123', 'BP-10001', 'earn')).toBe(
      'cc6f1ed248d733b53ba071ce8c773a514e028e2aeac203dc9dfceae699c2d56b',
    )
  })
})

describe('verifyScan', () => {
  it('accepts a valid earn signature and returns customer + intent', async () => {
    await makeScanCustomer('BP-20001', 6)
    const signature = computeServerSignature(SEED, 'BP-20001', 'earn')
    const result = await verifyScan({ membershipId: 'BP-20001', intent: 'earn', signature })
    expect(result).toMatchObject({ ok: true, customerName: 'Scan Target', stampBalance: 6, intent: 'earn' })
    if (result.ok) expect(typeof result.memberSince).toBe('string')
  })

  it('accepts a valid redeem signature and routes intent=redeem', async () => {
    await makeScanCustomer('BP-20002', 10)
    const signature = computeServerSignature(SEED, 'BP-20002', 'redeem')
    const result = await verifyScan({ membershipId: 'BP-20002', intent: 'redeem', signature })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.intent).toBe('redeem')
      expect(result.stampBalance).toBe(10)
    }
  })

  it('rejects a signature with a single byte flipped', async () => {
    await makeScanCustomer('BP-20003')
    const good = computeServerSignature(SEED, 'BP-20003', 'earn')
    const tampered = (good[0] === 'a' ? 'b' : 'a') + good.slice(1)
    const result = await verifyScan({ membershipId: 'BP-20003', intent: 'earn', signature: tampered })
    expect(result.ok).toBe(false)
  })

  it('rejects an earn signature replayed against intent=redeem', async () => {
    await makeScanCustomer('BP-20004')
    const earnSig = computeServerSignature(SEED, 'BP-20004', 'earn')
    const result = await verifyScan({ membershipId: 'BP-20004', intent: 'redeem', signature: earnSig })
    expect(result.ok).toBe(false)
  })

  it('rejects an unknown membership id (no enumeration)', async () => {
    const signature = computeServerSignature(SEED, 'BP-99999', 'earn')
    const result = await verifyScan({ membershipId: 'BP-99999', intent: 'earn', signature })
    expect(result.ok).toBe(false)
  })

  it('rejects malformed payloads', async () => {
    expect((await verifyScan(null)).ok).toBe(false)
    expect((await verifyScan({ membershipId: 'BP-1', intent: 'bogus', signature: 'x' })).ok).toBe(false)
    expect((await verifyScan({ membershipId: 'BP-1', intent: 'earn' })).ok).toBe(false)
  })
})
