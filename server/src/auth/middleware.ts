import type { NextFunction, Request, Response } from 'express'
import { Staff } from '../db.js'
import { verifyToken, type AuthRole, type TokenPayload } from './token.js'

// Attach the decoded token to the request for downstream handlers.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: TokenPayload
    }
  }
}

const BEARER = 'Bearer '

/** Verify the Bearer token and attach req.auth. 401 if missing/invalid. */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith(BEARER)) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }
  try {
    req.auth = verifyToken(header.slice(BEARER.length).trim())
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

/**
 * Require a logged-in staff member whose business role is "manager" (Task 7.3).
 * The JWT only carries the auth role ("staff"); the manager flag is re-checked against the DB.
 */
export async function requireManager(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.auth || req.auth.role !== 'staff') {
    res.status(403).json({ error: "You don't have access to that." })
    return
  }
  const staff = await Staff.findOne({ staffId: req.auth.sub }).select('role').lean()
  if (!staff || staff.role !== 'manager') {
    res.status(403).json({ error: 'Managers only.' })
    return
  }
  next()
}

/** Require an authenticated principal with the given role. 401 if unauthenticated, 403 if wrong role. */
export function requireRole(role: AuthRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required.' })
      return
    }
    if (req.auth.role !== role) {
      res.status(403).json({ error: "You don't have access to that." })
      return
    }
    next()
  }
}
