import { describe, expect, it } from 'vitest'
import { Customer } from '../src/db.js'
import { loginCustomer, registerCustomer } from '../src/auth/service.js'

describe('QR seed delivery (Task 3.1)', () => {
  it('delivers qrSeed + membershipId on register, with no password field anywhere', async () => {
    const result = await registerCustomer({
      name: 'Nina',
      email: 'nina@example.co.nz',
      phone: null,
      password: 'secret6',
    })
    expect(typeof result.qrSeed).toBe('string')
    expect(result.qrSeed.length).toBeGreaterThan(20)
    expect(result.customer.membershipId).toMatch(/^BP-\d+$/)
    // DoD: response must not contain any password field.
    expect(JSON.stringify(result).toLowerCase()).not.toContain('password')
    expect('passwordHash' in result.customer).toBe(false)
    // The seed must NOT leak into the public customer object.
    expect('qrSeed' in result.customer).toBe(false)
  })

  it('returns the same seed on login as the one stored in the DB', async () => {
    const reg = await registerCustomer({
      name: 'Omar',
      email: 'omar@example.co.nz',
      phone: null,
      password: 'secret6',
    })
    const login = await loginCustomer({ email: 'omar@example.co.nz', password: 'secret6' })
    const row = await Customer.findOne({ customerId: reg.customer.customerId }).lean()
    expect(login.qrSeed).toBe(reg.qrSeed)
    expect(login.qrSeed).toBe(row!.qrSeed)
  })

  it('gives each customer a distinct seed', async () => {
    const a = await registerCustomer({ name: 'P', email: 'p@example.co.nz', phone: null, password: 'secret6' })
    const b = await registerCustomer({ name: 'Q', email: 'q@example.co.nz', phone: null, password: 'secret6' })
    expect(a.qrSeed).not.toBe(b.qrSeed)
  })
})
