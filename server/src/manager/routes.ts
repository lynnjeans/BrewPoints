import { Router, type Response } from 'express'
import { AuthError } from '../auth/errors.js'
import { getManagerOverview } from './service.js'
import { createStaff, deleteStaff, listStaff, updateStaff } from './staff-admin.js'

// Mounted at /api/manager behind authenticate + requireManager (see index.ts).
export const managerRouter = Router()

function handleError(err: unknown, res: Response): void {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on our end.' })
}

// Read-only store overview (PDR 5.3).
managerRouter.get('/overview', async (_req, res) => {
  try {
    res.json(await getManagerOverview())
  } catch (err) {
    handleError(err, res)
  }
})

// --- Staff management CRUD (Task 03) ---

// READ
managerRouter.get('/staff', async (_req, res) => {
  try {
    res.json({ staff: await listStaff() })
  } catch (err) {
    handleError(err, res)
  }
})

// CREATE
managerRouter.post('/staff', async (req, res) => {
  try {
    const { name, email, role, password } = (req.body ?? {}) as Record<string, unknown>
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof role !== 'string' ||
      typeof password !== 'string'
    ) {
      res.status(400).json({ error: 'name, email, role and password are required.' })
      return
    }
    const staff = await createStaff({ name, email, role, password })
    res.status(201).json({ staff })
  } catch (err) {
    handleError(err, res)
  }
})

// UPDATE
managerRouter.patch('/staff/:staffId', async (req, res) => {
  try {
    const staffId = Number(req.params.staffId)
    if (!Number.isInteger(staffId)) {
      res.status(400).json({ error: 'Invalid staff id.' })
      return
    }
    const body = (req.body ?? {}) as { name?: unknown; role?: unknown; password?: unknown }
    const input: { name?: string; role?: string; password?: string } = {}
    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        res.status(400).json({ error: 'name must be a string.' })
        return
      }
      input.name = body.name
    }
    if (body.role !== undefined) {
      if (typeof body.role !== 'string') {
        res.status(400).json({ error: 'role must be a string.' })
        return
      }
      input.role = body.role
    }
    if (body.password !== undefined) {
      if (typeof body.password !== 'string') {
        res.status(400).json({ error: 'password must be a string.' })
        return
      }
      input.password = body.password
    }
    const staff = await updateStaff(staffId, input)
    res.json({ staff })
  } catch (err) {
    handleError(err, res)
  }
})

// DELETE
managerRouter.delete('/staff/:staffId', async (req, res) => {
  try {
    const staffId = Number(req.params.staffId)
    if (!Number.isInteger(staffId)) {
      res.status(400).json({ error: 'Invalid staff id.' })
      return
    }
    await deleteStaff(staffId, req.auth!.sub)
    res.json({ ok: true })
  } catch (err) {
    handleError(err, res)
  }
})
