import { Router } from 'express'
import { getManagerOverview } from './service.js'

// Mounted at /api/manager behind authenticate + requireManager (see index.ts). Read-only.
export const managerRouter = Router()

managerRouter.get('/overview', async (_req, res) => {
  try {
    const overview = await getManagerOverview()
    res.json(overview)
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})
