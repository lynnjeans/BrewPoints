import { describe, expect, it } from 'vitest'
import { Customer } from '../src/db.js'
import { verifyPassword } from '../src/auth/password.js'
import { findOrCreateGoogleCustomer, loginCustomer, registerCustomer } from '../src/auth/service.js'
import { verifyToken } from '../src/auth/token.js'

describe('registerCustomer', () => {
  it('stores the password as a bcrypt hash, never plaintext (PDR 9.3)', async () => {
    const { customer } = await registerCustomer({
      name: 'Cara',
      email: 'cara@example.co.nz',
      phone: null,
      password: 'hunter2',
    })
    const row = await Customer.findOne({ customerId: customer.customerId }).lean()
    expect(row?.passwordHash).toBeTruthy()
    expect(row?.passwordHash).not.toBe('hunter2')
    expect(await verifyPassword('hunter2', row?.passwordHash ?? '')).toBe(true)
  })

  it('succeeds with no phone (phone is optional)', async () => {
    const { customer } = await registerCustomer({
      name: 'Dee',
      email: 'dee@example.co.nz',
      phone: null,
      password: 'sixsix',
    })
    expect(customer.phone).toBeNull()
    expect(customer.membershipId).toMatch(/^BP-\d+$/)
  })

  it('issues a customer-scoped token', async () => {
    const { token } = await registerCustomer({
      name: 'Finn',
      email: 'finn@example.co.nz',
      phone: '021 555 0199',
      password: 'correct-horse',
    })
    const payload = verifyToken(token)
    expect(payload.role).toBe('customer')
    expect(typeof payload.sub).toBe('number')
  })

  it('rejects a duplicate email', async () => {
    await registerCustomer({ name: 'Gus', email: 'gus@example.co.nz', phone: null, password: 'abcdef' })
    await expect(
      registerCustomer({ name: 'Gus2', email: 'gus@example.co.nz', phone: null, password: 'abcdef' }),
    ).rejects.toThrow()
  })
})

describe('loginCustomer', () => {
  it('rejects a wrong password', async () => {
    await registerCustomer({ name: 'Eve', email: 'eve@example.co.nz', phone: null, password: 'correct1' })
    await expect(loginCustomer({ email: 'eve@example.co.nz', password: 'wrong-one' })).rejects.toThrow()
  })

  it('succeeds with the correct password and returns a token', async () => {
    await registerCustomer({ name: 'Ivy', email: 'ivy@example.co.nz', phone: null, password: 'correct1' })
    const { token, customer } = await loginCustomer({ email: 'ivy@example.co.nz', password: 'correct1' })
    expect(typeof token).toBe('string')
    expect(customer.email).toBe('ivy@example.co.nz')
  })

  it('rejects an unknown email with the same generic error', async () => {
    await expect(loginCustomer({ email: 'nobody@example.co.nz', password: 'whatever' })).rejects.toThrow()
  })
})

describe('findOrCreateGoogleCustomer (Task 2.2)', () => {
  it('creates a passwordless google account on first sign-in', async () => {
    const result = await findOrCreateGoogleCustomer('newg@example.co.nz', 'New G')
    expect(result.customer.authProvider).toBe('google')
    expect(result.customer.membershipId).toMatch(/^BP-\d+$/)
    expect(typeof result.qrSeed).toBe('string')
    const row = await Customer.findOne({ email: 'newg@example.co.nz' }).lean()
    expect(row?.passwordHash).toBeNull()
  })

  it('logs into the existing account on repeat (no duplicate)', async () => {
    const a = await findOrCreateGoogleCustomer('repeat@example.co.nz', 'R')
    const b = await findOrCreateGoogleCustomer('repeat@example.co.nz', 'R')
    expect(b.customer.customerId).toBe(a.customer.customerId)
    expect(await Customer.countDocuments({ email: 'repeat@example.co.nz' })).toBe(1)
  })

  it('matches existing accounts case-insensitively by email', async () => {
    const a = await findOrCreateGoogleCustomer('MixedCase@example.co.nz', 'M')
    const b = await findOrCreateGoogleCustomer('mixedcase@example.co.nz', 'M')
    expect(b.customer.customerId).toBe(a.customer.customerId)
  })
})
