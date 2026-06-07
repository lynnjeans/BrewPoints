import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { hashPassword } from '../src/auth/password.js'
import { loginStaff } from '../src/auth/service.js'
import { authenticate, requireRole } from '../src/auth/middleware.js'
import { signToken } from '../src/auth/token.js'
import { makeStaff } from './helpers.js'

async function seedStaff() {
  return makeStaff({
    name: 'Sam Barista',
    email: 'sam@brewpoints.local',
    role: 'staff',
    passwordHash: await hashPassword('barista6'),
  })
}

function mockRes(): Response {
  const res = { statusCode: 200 } as unknown as Response
  res.status = vi.fn((code: number) => {
    ;(res as { statusCode: number }).statusCode = code
    return res
  }) as unknown as Response['status']
  res.json = vi.fn(() => res) as unknown as Response['json']
  return res
}

function reqWith(token?: string): Request {
  return { headers: token ? { authorization: `Bearer ${token}` } : {} } as Request
}

describe('loginStaff', () => {
  it('issues a staff-scoped token for correct credentials', async () => {
    const staff = await seedStaff()
    const { token, staff: pub } = await loginStaff({
      email: 'sam@brewpoints.local',
      password: 'barista6',
    })
    expect(typeof token).toBe('string')
    expect(pub.staffId).toBe(staff.staffId)
    expect(pub.role).toBe('staff')
  })

  it('rejects a wrong password', async () => {
    await seedStaff()
    await expect(loginStaff({ email: 'sam@brewpoints.local', password: 'nope' })).rejects.toThrow()
  })
})

describe('route guards (PDR 9.3 / R1)', () => {
  it('authenticate rejects a request with no token (401)', () => {
    const res = mockRes()
    const next = vi.fn() as unknown as NextFunction
    authenticate(reqWith(), res, next)
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('authenticate rejects a garbage token (401)', () => {
    const res = mockRes()
    const next = vi.fn() as unknown as NextFunction
    authenticate(reqWith('not-a-real-token'), res, next)
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('authenticate accepts a valid token and attaches req.auth', () => {
    const token = signToken({ sub: 7, role: 'staff' })
    const req = reqWith(token)
    const res = mockRes()
    const next = vi.fn() as unknown as NextFunction
    authenticate(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.auth?.role).toBe('staff')
    expect(req.auth?.sub).toBe(7)
  })

  it('requireRole("staff") rejects a customer token (403)', () => {
    const req = reqWith()
    req.auth = { sub: 1, role: 'customer' }
    const res = mockRes()
    const next = vi.fn() as unknown as NextFunction
    requireRole('staff')(req, res, next)
    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('requireRole("staff") allows a staff token', () => {
    const req = reqWith()
    req.auth = { sub: 7, role: 'staff' }
    const res = mockRes()
    const next = vi.fn() as unknown as NextFunction
    requireRole('staff')(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})
