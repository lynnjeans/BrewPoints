import { describe, expect, it } from 'vitest'
import { buildQrPayload, computeQrSignature, serializeQrPayload } from './signature'

const SEED = 'test-seed-abc123'
const MEMBERSHIP = 'BP-10001'

describe('computeQrSignature', () => {
  it('is deterministic — same inputs yield the same signature', async () => {
    const a = await computeQrSignature(SEED, MEMBERSHIP, 'earn')
    const b = await computeQrSignature(SEED, MEMBERSHIP, 'earn')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/) // SHA-256 hex
  })

  it('differs by intent', async () => {
    const earn = await computeQrSignature(SEED, MEMBERSHIP, 'earn')
    const redeem = await computeQrSignature(SEED, MEMBERSHIP, 'redeem')
    expect(earn).not.toBe(redeem)
  })

  it('differs by seed', async () => {
    const a = await computeQrSignature(SEED, MEMBERSHIP, 'earn')
    const b = await computeQrSignature('a-different-seed', MEMBERSHIP, 'earn')
    expect(a).not.toBe(b)
  })

  it('matches a known reference vector (locks the client/server contract)', async () => {
    // Reference vector computed with node crypto (the server's library, Task 3.3):
    //   crypto.createHmac('sha256','test-seed-abc123').update('BP-10001|earn').digest('hex')
    // Client Web Crypto matching this proves the two implementations agree.
    const sig = await computeQrSignature('test-seed-abc123', 'BP-10001', 'earn')
    expect(sig).toBe('cc6f1ed248d733b53ba071ce8c773a514e028e2aeac203dc9dfceae699c2d56b')
  })
})

describe('serializeQrPayload', () => {
  it('contains only membershipId, intent, signature — never the seed', async () => {
    const payload = await buildQrPayload(SEED, MEMBERSHIP, 'earn')
    const text = serializeQrPayload(payload)
    const parsed = JSON.parse(text) as Record<string, unknown>
    expect(Object.keys(parsed).sort()).toEqual(['intent', 'membershipId', 'signature'])
    expect(text).not.toContain(SEED)
    expect(text.toLowerCase()).not.toContain('seed')
  })
})
