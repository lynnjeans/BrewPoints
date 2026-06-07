import { randomBytes } from 'node:crypto'
import {
  Customer,
  PushSubscription,
  Redemption,
  Staff,
  StampTransaction,
  nextId,
  type CustomerDoc,
  type StaffDoc,
} from '../db.js'
import { AuthError } from './errors.js'
import { hashPassword, verifyPassword } from './password.js'
import { signToken } from './token.js'
import type { LoginInput, RegisterInput } from './validation.js'

export interface PublicCustomer {
  customerId: number
  name: string
  email: string
  phone: string | null
  membershipId: string
  authProvider: string
  stampBalance: number
}

export interface AuthResult {
  token: string
  customer: PublicCustomer
  // The owner's QR signing seed (R3). Delivered only to the authenticated owner so their
  // device can compute QR signatures offline (Task 3.2). Kept OUT of PublicCustomer so it is
  // never accidentally exposed in non-owner contexts (e.g. the staff scan response, Task 3.3).
  qrSeed: string
}

function toPublic(c: CustomerDoc): PublicCustomer {
  return {
    customerId: c.customerId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    membershipId: c.membershipId,
    authProvider: c.authProvider,
    stampBalance: c.stampBalance,
  }
}

// New customers get a fresh per-customer QR seed (R3). Task 3.1 formalises the seed lifecycle
// and its delivery to the client; here we only need to satisfy the required field.
function newQrSeed(): string {
  return randomBytes(32).toString('base64url')
}

// Allocate the next customerId from the counter and derive the membership id from it (BP-10001…).
async function createCustomer(
  data: Omit<CustomerDoc, 'customerId' | 'membershipId' | 'stampBalance' | 'createdAt'>,
): Promise<CustomerDoc> {
  const customerId = await nextId('customer')
  const created = await Customer.create({
    ...data,
    customerId,
    membershipId: `BP-${10000 + customerId}`,
  })
  return created.toObject()
}

export async function registerCustomer(input: RegisterInput): Promise<AuthResult> {
  const existing = await Customer.findOne({ email: input.email }).lean()
  if (existing) throw new AuthError(409, 'That email is already registered.')

  const passwordHash = await hashPassword(input.password)
  const qrSeed = newQrSeed()

  const customer = await createCustomer({
    name: input.name,
    email: input.email,
    phone: input.phone,
    authProvider: 'email',
    passwordHash,
    qrSeed,
  })

  const token = signToken({ sub: customer.customerId, role: 'customer' })
  return { token, customer: toPublic(customer), qrSeed: customer.qrSeed }
}

export async function loginCustomer(input: LoginInput): Promise<AuthResult> {
  const customer = await Customer.findOne({ email: input.email }).lean()
  // Generic message — do not reveal whether the email exists (anti-enumeration).
  const invalid = new AuthError(401, 'Email or password is incorrect.')
  if (!customer || customer.authProvider !== 'email' || !customer.passwordHash) throw invalid

  const ok = await verifyPassword(input.password, customer.passwordHash)
  if (!ok) throw invalid

  const token = signToken({ sub: customer.customerId, role: 'customer' })
  return { token, customer: toPublic(customer), qrSeed: customer.qrSeed }
}

// Google OAuth (Task 2.2): same button handles signup + login. Look up by verified email —
// existing account logs in; otherwise create a passwordless google account.
export async function findOrCreateGoogleCustomer(email: string, name: string): Promise<AuthResult> {
  const normalizedEmail = email.toLowerCase()
  const existing = await Customer.findOne({ email: normalizedEmail }).lean()
  if (existing) {
    const token = signToken({ sub: existing.customerId, role: 'customer' })
    return { token, customer: toPublic(existing), qrSeed: existing.qrSeed }
  }

  const customer = await createCustomer({
    name: name.trim() === '' ? 'Friend' : name.trim(),
    email: normalizedEmail,
    phone: null,
    authProvider: 'google',
    passwordHash: null,
    qrSeed: newQrSeed(),
  })

  const token = signToken({ sub: customer.customerId, role: 'customer' })
  return { token, customer: toPublic(customer), qrSeed: customer.qrSeed }
}

export interface PublicStaff {
  staffId: number
  name: string
  email: string
  role: string
}

function toPublicStaff(s: StaffDoc): PublicStaff {
  return { staffId: s.staffId, name: s.name, email: s.email, role: s.role }
}

export interface StaffAuthResult {
  token: string
  staff: PublicStaff
}

export async function loginStaff(input: LoginInput): Promise<StaffAuthResult> {
  const staff = await Staff.findOne({ email: input.email }).lean()
  const invalid = new AuthError(401, 'Email or password is incorrect.')
  if (!staff || !staff.passwordHash) throw invalid

  const ok = await verifyPassword(input.password, staff.passwordHash)
  if (!ok) throw invalid

  const token = signToken({ sub: staff.staffId, role: 'staff' })
  return { token, staff: toPublicStaff(staff) }
}

export async function getCustomerById(customerId: number): Promise<PublicCustomer> {
  const customer = await Customer.findOne({ customerId }).lean()
  if (!customer) throw new AuthError(404, 'Customer not found.')
  return toPublic(customer)
}

export interface UpdateCustomerInput {
  name?: string
  phone?: string | null
}

// CRUD "Update" for the account feature: a customer edits their own name / phone.
// Email and auth provider are immutable (identity); balance is never editable here (R1/R2).
export async function updateCustomer(
  customerId: number,
  input: UpdateCustomerInput,
): Promise<PublicCustomer> {
  const update: Partial<Pick<CustomerDoc, 'name' | 'phone'>> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (name === '') throw new AuthError(400, 'Name cannot be empty.')
    update.name = name
  }
  if (input.phone !== undefined) {
    const phone = input.phone === null ? null : input.phone.trim()
    update.phone = phone === '' ? null : phone
  }
  if (Object.keys(update).length === 0) throw new AuthError(400, 'Nothing to update.')

  const updated = await Customer.findOneAndUpdate(
    { customerId },
    { $set: update },
    { new: true },
  ).lean()
  if (!updated) throw new AuthError(404, 'Customer not found.')
  return toPublic(updated)
}

// CRUD "Delete" for the account feature: a customer deletes their own account and all data
// (transactions, redemptions, push subscriptions). Right-to-erasure friendly.
export async function deleteCustomer(customerId: number): Promise<void> {
  const existing = await Customer.findOne({ customerId }).select('customerId').lean()
  if (!existing) throw new AuthError(404, 'Customer not found.')
  await Promise.all([
    StampTransaction.deleteMany({ customerId }),
    Redemption.deleteMany({ customerId }),
    PushSubscription.deleteMany({ customerId }),
  ])
  await Customer.deleteOne({ customerId })
}

export async function getStaffById(staffId: number): Promise<PublicStaff> {
  const staff = await Staff.findOne({ staffId }).lean()
  if (!staff) throw new AuthError(404, 'Staff not found.')
  return toPublicStaff(staff)
}
