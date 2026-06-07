import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export type AuthRole = 'customer' | 'staff'

export interface TokenPayload {
  sub: number // customerId (or staffId once staff auth exists)
  role: AuthRole
}

const EXPIRES_IN = '30d'

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret)
  if (typeof decoded === 'string' || typeof decoded.sub === 'undefined') {
    throw new Error('Malformed token')
  }
  return { sub: Number(decoded.sub), role: decoded.role as AuthRole }
}
