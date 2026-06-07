import express from 'express'
import { config } from './config.js'
import { connectDb } from './db.js'
import { authRouter } from './auth/routes.js'
import { googleRouter } from './auth/google.js'
import { authenticate, requireManager, requireRole } from './auth/middleware.js'
import { staffRouter } from './staff/routes.js'
import { customerRouter } from './customer/routes.js'
import { managerRouter } from './manager/routes.js'

const app = express()

app.use(express.json())

// Health check — used to confirm the server is up (Task 0.1 DoD).
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/auth', googleRouter)

// Everything under /api/staff requires a logged-in staff member (PDR 9.3, R1).
app.use('/api/staff', authenticate, requireRole('staff'), staffRouter)

// Everything under /api/me serves the logged-in customer their own data.
app.use('/api/me', authenticate, requireRole('customer'), customerRouter)

// Manager-only read-only store overview (PDR 5.3).
app.use('/api/manager', authenticate, requireManager, managerRouter)

// Connect to MongoDB before accepting traffic — fail fast if the DB is unreachable.
connectDb(config.mongoUri)
  .then(() => {
    app.listen(config.port, () => {
      console.info(`BrewPoints server listening on http://localhost:${config.port}`)
    })
  })
  .catch((err: unknown) => {
    console.error('Failed to connect to MongoDB — server not started:', err)
    process.exitCode = 1
  })
