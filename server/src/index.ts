import express from 'express'
import { pinoHttp } from 'pino-http'
import { config } from './config.js'
import { connectDb } from './db.js'
import { logger } from './logger.js'
import { errorHandler, notFound } from './middleware/error-handler.js'
import { authRouter } from './auth/routes.js'
import { googleRouter } from './auth/google.js'
import { authenticate, requireManager, requireRole } from './auth/middleware.js'
import { staffRouter } from './staff/routes.js'
import { customerRouter } from './customer/routes.js'
import { managerRouter } from './manager/routes.js'
import { pushPublicRouter, pushRouter } from './push/routes.js'
import { initPush } from './push/service.js'

const app = express()

// Structured request logging (Task 07): one line per request with method/url/status/latency,
// and req.log available inside handlers. Secrets are redacted by the shared logger config.
app.use(pinoHttp({ logger }))
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

// Web Push (Task 05). Public key is open; subscribe/test are customer-scoped.
app.use('/api/push', pushPublicRouter)
app.use('/api/me/push', authenticate, requireRole('customer'), pushRouter)

// 404 + central error handler must come AFTER all routes.
app.use(notFound)
app.use(errorHandler)

// Connect to MongoDB before accepting traffic — fail fast if the DB is unreachable.
connectDb(config.mongoUri)
  .then(() => {
    initPush() // configure Web Push from VAPID env (no-op + warning if unset)
    app.listen(config.port, () => {
      logger.info({ port: config.port }, `BrewPoints server listening on http://localhost:${String(config.port)}`)
    })
  })
  .catch((err: unknown) => {
    logger.fatal({ err }, 'Failed to connect to MongoDB — server not started')
    process.exitCode = 1
  })
