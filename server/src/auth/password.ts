import bcrypt from 'bcryptjs'

// PDR 9.3: passwords are only ever stored as bcrypt hashes, never plaintext.
const COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
