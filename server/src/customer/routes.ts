import { Router, type Request, type Response } from 'express'
import { AuthError } from '../auth/errors.js'
import { deleteCustomer, getCustomerById, updateCustomer } from '../auth/service.js'
import { getRedemptions, getTransactions } from '../loyalty/history.js'

// Mounted at /api/me behind authenticate + requireRole('customer') (see index.ts).
// Every route serves ONLY the authenticated customer's own data (id from req.auth.sub) — a
// customer can never request someone else's history. These are read-only (cacheable in Task 7.1).
export const customerRouter = Router()

// Map a thrown error to a response: typed AuthError → its status; anything else → logged 500.
// (A common cause of a 404 here is a stale token whose customerId no longer exists in the DB.)
function handleError(err: unknown, req: Request, res: Response): void {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  req.log.error({ err }, 'customer route failed')
  res.status(500).json({ error: 'Something went wrong on our end.' })
}

// Current profile + balance snapshot (used by the coffee card, Task 5.2).
customerRouter.get('/', async (req, res) => {
  try {
    const customer = await getCustomerById(req.auth!.sub)
    res.json({ customer })
  } catch (err) {
    handleError(err, req, res)
  }
})

// Update the authenticated customer's own profile (CRUD: Update).
customerRouter.patch('/', async (req, res) => {
  try {
    const body = (req.body ?? {}) as { name?: unknown; phone?: unknown }
    const input: { name?: string; phone?: string | null } = {}
    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        res.status(400).json({ error: 'name must be a string.' })
        return
      }
      input.name = body.name
    }
    if (body.phone !== undefined) {
      if (body.phone !== null && typeof body.phone !== 'string') {
        res.status(400).json({ error: 'phone must be a string or null.' })
        return
      }
      input.phone = body.phone
    }
    const customer = await updateCustomer(req.auth!.sub, input)
    res.json({ customer })
  } catch (err) {
    handleError(err, req, res)
  }
})

// Delete the authenticated customer's own account and all their data (CRUD: Delete).
customerRouter.delete('/', async (req, res) => {
  try {
    await deleteCustomer(req.auth!.sub)
    res.json({ ok: true })
  } catch (err) {
    handleError(err, req, res)
  }
})

customerRouter.get('/transactions', async (req, res) => {
  try {
    const transactions = await getTransactions(req.auth!.sub)
    res.json({ transactions })
  } catch (err) {
    handleError(err, req, res)
  }
})

customerRouter.get('/redemptions', async (req, res) => {
  try {
    const redemptions = await getRedemptions(req.auth!.sub)
    res.json({ redemptions })
  } catch (err) {
    handleError(err, req, res)
  }
})
