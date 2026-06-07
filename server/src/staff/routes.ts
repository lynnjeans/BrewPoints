import { Router } from 'express'
import { getStaffById } from '../auth/service.js'
import { verifyScan } from '../qr/verify.js'
import { earnStamps, StampError } from '../loyalty/stamps.js'
import { redeemReward } from '../loyalty/redeem.js'

// Mounted at /api/staff behind authenticate + requireRole('staff') (see index.ts),
// so every route here is staff-only. Task 4.1/4.3 (earn/redeem) will live under this guard too.
export const staffRouter = Router()

staffRouter.get('/me', async (req, res) => {
  try {
    // req.auth is guaranteed by the mounted guard.
    const staffId = req.auth!.sub
    const staff = await getStaffById(staffId)
    res.json({ staff })
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

// Scan-verify a customer QR (Task 3.3). NETWORK ONLY — the service worker must never cache this
// (configured in Task 7.1). Returns the customer + intent so the staff UI can route (earn vs redeem).
staffRouter.post('/scan', async (req, res) => {
  try {
    const result = await verifyScan(req.body)
    if (!result.ok) {
      res
        .status(400)
        .json({ error: "Couldn't read that code. Ask the customer to refresh it in their app." })
      return
    }
    res.json({
      customerName: result.customerName,
      stampBalance: result.stampBalance,
      intent: result.intent,
      memberSince: result.memberSince,
    })
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

// Add 1 or 2 stamps (Task 4.1). Staff-only (mounted guard); records which staff via req.auth.sub.
staffRouter.post('/earn', async (req, res) => {
  try {
    const { membershipId, stamps, idempotencyKey } = (req.body ?? {}) as {
      membershipId?: unknown
      stamps?: unknown
      idempotencyKey?: unknown
    }
    if (typeof membershipId !== 'string' || typeof stamps !== 'number') {
      res.status(400).json({ error: 'membershipId and stamps are required.' })
      return
    }
    const key = typeof idempotencyKey === 'string' ? idempotencyKey : undefined
    const result = await earnStamps(membershipId, req.auth!.sub, stamps, key)
    res.json(result)
  } catch (err) {
    if (err instanceof StampError) {
      res.status(err.statusCode).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

// Confirm a redemption (Task 4.3) — THE ONLY stamp-deduction entry point (R1).
// Staff-only (mounted guard); records which staff via req.auth.sub.
staffRouter.post('/redeem', async (req, res) => {
  try {
    const { membershipId } = (req.body ?? {}) as { membershipId?: unknown }
    if (typeof membershipId !== 'string') {
      res.status(400).json({ error: 'membershipId is required.' })
      return
    }
    const result = await redeemReward(membershipId, req.auth!.sub)
    res.json(result)
  } catch (err) {
    if (err instanceof StampError) {
      res.status(err.statusCode).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})
