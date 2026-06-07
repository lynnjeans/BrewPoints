import { Staff, nextId } from '../db.js'
import { AuthError } from '../auth/errors.js'
import { hashPassword } from '../auth/password.js'

// Manager-only CRUD for staff accounts (Task 03 — a second full-CRUD feature).
// Guarded by requireManager in the router. Does not touch loyalty data, so red lines are unaffected.

export interface PublicStaffRow {
  staffId: number
  name: string
  email: string
  role: string
  createdAt: Date
}

const ROLES = ['staff', 'manager']
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MIN_PASSWORD = 6

function toRow(s: {
  staffId: number
  name: string
  email: string
  role: string
  createdAt: Date
}): PublicStaffRow {
  return { staffId: s.staffId, name: s.name, email: s.email, role: s.role, createdAt: s.createdAt }
}

// READ
export async function listStaff(): Promise<PublicStaffRow[]> {
  const rows = await Staff.find().select('staffId name email role createdAt').sort({ staffId: 1 }).lean()
  return rows.map(toRow)
}

export interface CreateStaffInput {
  name: string
  email: string
  role: string
  password: string
}

// CREATE
export async function createStaff(input: CreateStaffInput): Promise<PublicStaffRow> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const role = input.role.trim()

  const errors: string[] = []
  if (name === '') errors.push('name is required')
  if (!EMAIL_RE.test(email)) errors.push('a valid email is required')
  if (!ROLES.includes(role)) errors.push('role must be "staff" or "manager"')
  if (input.password.length < MIN_PASSWORD) errors.push(`password must be at least ${MIN_PASSWORD} characters`)
  if (errors.length > 0) throw new AuthError(400, errors.join('; '))

  const existing = await Staff.findOne({ email }).lean()
  if (existing) throw new AuthError(409, 'A staff member with that email already exists.')

  const staffId = await nextId('staff')
  const created = await Staff.create({
    staffId,
    name,
    email,
    role,
    passwordHash: await hashPassword(input.password),
  })
  return toRow(created.toObject())
}

export interface UpdateStaffInput {
  name?: string
  role?: string
  password?: string
}

// UPDATE
export async function updateStaff(staffId: number, input: UpdateStaffInput): Promise<PublicStaffRow> {
  const update: Record<string, string> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (name === '') throw new AuthError(400, 'Name cannot be empty.')
    update.name = name
  }
  if (input.role !== undefined) {
    const role = input.role.trim()
    if (!ROLES.includes(role)) throw new AuthError(400, 'role must be "staff" or "manager".')
    update.role = role
  }
  if (input.password !== undefined) {
    if (input.password.length < MIN_PASSWORD) {
      throw new AuthError(400, `password must be at least ${MIN_PASSWORD} characters`)
    }
    update.passwordHash = await hashPassword(input.password)
  }
  if (Object.keys(update).length === 0) throw new AuthError(400, 'Nothing to update.')

  // Don't allow demoting the last manager (would lock everyone out of the manager area).
  if (update.role === 'staff') await assertNotLastManager(staffId)

  const updated = await Staff.findOneAndUpdate({ staffId }, { $set: update }, { new: true })
    .select('staffId name email role createdAt')
    .lean()
  if (!updated) throw new AuthError(404, 'Staff member not found.')
  return toRow(updated)
}

// DELETE
export async function deleteStaff(staffId: number, actingStaffId: number): Promise<void> {
  if (staffId === actingStaffId) {
    throw new AuthError(400, "You can't delete your own account while signed in.")
  }
  const existing = await Staff.findOne({ staffId }).select('staffId role').lean()
  if (!existing) throw new AuthError(404, 'Staff member not found.')
  if (existing.role === 'manager') await assertNotLastManager(staffId)
  await Staff.deleteOne({ staffId })
}

// Guard: refuse an operation that would remove the final manager.
async function assertNotLastManager(staffId: number): Promise<void> {
  const managerCount = await Staff.countDocuments({ role: 'manager' })
  const target = await Staff.findOne({ staffId }).select('role').lean()
  if (target?.role === 'manager' && managerCount <= 1) {
    throw new AuthError(409, 'There must be at least one manager.')
  }
}
