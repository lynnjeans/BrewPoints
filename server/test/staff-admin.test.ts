import { describe, expect, it } from 'vitest'
import { Staff } from '../src/db.js'
import { AuthError } from '../src/auth/errors.js'
import { verifyPassword } from '../src/auth/password.js'
import { createStaff, deleteStaff, listStaff, updateStaff } from '../src/manager/staff-admin.js'
import { makeStaff } from './helpers.js'

const NEW = { name: 'Pat Barista', email: 'pat@brewpoints.local', role: 'staff', password: 'barista6' }

describe('staff-admin CRUD (Task 03, manager-only)', () => {
  it('CREATE: adds a staff member with a hashed password', async () => {
    const created = await createStaff(NEW)
    expect(created.staffId).toBeGreaterThan(0)
    expect(created.email).toBe('pat@brewpoints.local')
    const row = await Staff.findOne({ staffId: created.staffId }).lean()
    expect(row?.passwordHash).toBeTruthy()
    expect(row?.passwordHash).not.toBe('barista6')
    expect(await verifyPassword('barista6', row?.passwordHash ?? '')).toBe(true)
  })

  it('CREATE: rejects a duplicate email', async () => {
    await createStaff(NEW)
    await expect(createStaff(NEW)).rejects.toBeInstanceOf(AuthError)
  })

  it('CREATE: rejects an invalid role', async () => {
    await expect(createStaff({ ...NEW, role: 'owner' })).rejects.toBeInstanceOf(AuthError)
  })

  it('READ: lists staff without leaking password hashes', async () => {
    await createStaff(NEW)
    const list = await listStaff()
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(list).toLowerCase()).not.toContain('password')
  })

  it('UPDATE: changes name and role', async () => {
    const created = await createStaff(NEW)
    const updated = await updateStaff(created.staffId, { name: 'Pat Senior', role: 'manager' })
    expect(updated.name).toBe('Pat Senior')
    expect(updated.role).toBe('manager')
  })

  it('UPDATE: refuses to demote the last manager', async () => {
    const mgr = await makeStaff({ role: 'manager', email: 'only-mgr@brewpoints.local' })
    await expect(updateStaff(mgr.staffId, { role: 'staff' })).rejects.toBeInstanceOf(AuthError)
  })

  it('DELETE: removes a staff member', async () => {
    const created = await createStaff(NEW)
    const actingManager = await makeStaff({ role: 'manager', email: 'boss@brewpoints.local' })
    await deleteStaff(created.staffId, actingManager.staffId)
    expect(await Staff.countDocuments({ staffId: created.staffId })).toBe(0)
  })

  it('DELETE: refuses to delete yourself', async () => {
    const self = await makeStaff({ role: 'manager', email: 'self@brewpoints.local' })
    await expect(deleteStaff(self.staffId, self.staffId)).rejects.toBeInstanceOf(AuthError)
  })

  it('DELETE: refuses to delete the last manager', async () => {
    const onlyMgr = await makeStaff({ role: 'manager', email: 'last@brewpoints.local' })
    const actor = await makeStaff({ role: 'staff', email: 'actor@brewpoints.local' })
    // Only one manager exists; a different actor tries to delete them → blocked by the guard.
    await expect(deleteStaff(onlyMgr.staffId, actor.staffId)).rejects.toBeInstanceOf(AuthError)
  })
})
