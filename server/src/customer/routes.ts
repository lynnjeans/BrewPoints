import { Router } from 'express'
import { getCustomerById } from '../auth/service.js'
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
