import { AuthError } from './errors.js'

export interface RegisterInput {
  name: string
  email: string
  phone: string | null
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

const MIN_PASSWORD_LENGTH = 6
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function trimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

export function validateRegister(body: unknown): RegisterInput {
  const b = (body ?? {}) as Record<string, unknown>
  const name = trimmedString(b.name)
  const email = trimmedString(b.email)
  const password = typeof b.password === 'string' ? b.password : ''
  const phone = trimmedString(b.phone) // optional — null when blank

  const errors: string[] = []
  if (!name) errors.push('name is required')
  if (!email || !EMAIL_RE.test(email)) errors.push('a valid email is required')
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  if (errors.length > 0) throw new AuthError(400, errors.join('; '))

  return {
    name: name as string,
    email: (email as string).toLowerCase(),
    phone,
    password,
  }
}

export function validateLogin(body: unknown): LoginInput {
  const b = (body ?? {}) as Record<string, unknown>
  const email = trimmedString(b.email)
  const password = typeof b.password === 'string' ? b.password : ''
  if (!email || password === '') throw new AuthError(400, 'email and password are required')
  return { email: email.toLowerCase(), password }
}
