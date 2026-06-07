import { Router } from 'express'
import { AuthError } from '../auth/errors.js'
import { deleteCustomer, getCustomerById, updateCustomer } from '../auth/service.js'
import { getRedemptions, getTransactions } from '../loyalty/history.js'

// Mounted at /api/me behind authenticate + requireRole('customer') (see index.ts).
// Every route serves ONLY the authenticated customer's own data (id from req.auth.sub) — a
// customer can never request someone else's history. These are read-only (cacheable in Task 7.1).
export const customerRouter = Router()

// Current profile + balance snapshot (used by the coffee card, Task 5.2).
customerRouter.get('/', async (req, res) => {
  try {
    const customer = await getCustomerById(req.auth!.sub)
    res.json({ customer })
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
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
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message })
      return
    }
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

// Delete the authenticated customer's own account and all their data (CRUD: Delete).
customerRouter.delete('/', async (req, res) => {
  try {
    await deleteCustomer(req.auth!.sub)
    res.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message })
      return
    }
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

customerRouter.get('/transactions', async (req, res) => {
  try {
    const transactions = await getTransactions(req.auth!.sub)
    res.json({ transactions })
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

customerRouter.get('/redemptions', async (req, res) => {
  try {
    const redemptions = await getRedemptions(req.auth!.sub)
    res.json({ redemptions })
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})
