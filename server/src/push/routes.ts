import { Router } from 'express'
import { config } from '../config.js'
import {
  isPushConfigured,
  removeSubscription,
  saveSubscription,
  sendToCustomer,
  type WebPushSubscription,
} from './service.js'

// Public: the client fetches the VAPID public key at runtime (no rebuild needed when keys change).
export const pushPublicRouter = Router()

pushPublicRouter.get('/public-key', (_req, res) => {
  res.json({ publicKey: config.vapid.publicKey, enabled: isPushConfigured() })
})

// Customer-scoped: mounted at /api/me/push behind authenticate + requireRole('customer').
export const pushRouter = Router()

function parseSubscription(body: unknown): WebPushSubscription | null {
  if (typeof body !== 'object' || body === null) return null
  const { endpoint, keys } = body as Record<string, unknown>
  if (typeof endpoint !== 'string' || typeof keys !== 'object' || keys === null) return null
  const { p256dh, auth } = keys as Record<string, unknown>
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null
  return { endpoint, keys: { p256dh, auth } }
}

pushRouter.post('/subscribe', async (req, res) => {
  try {
    const sub = parseSubscription(req.body)
    if (!sub) {
      res.status(400).json({ error: 'A valid push subscription is required.' })
      return
    }
    await saveSubscription(req.auth!.sub, sub)
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

pushRouter.post('/unsubscribe', async (req, res) => {
  try {
    const endpoint = (req.body as { endpoint?: unknown })?.endpoint
    if (typeof endpoint !== 'string') {
      res.status(400).json({ error: 'endpoint is required.' })
      return
    }
    await removeSubscription(endpoint)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})

// Send a test notification to the logged-in customer's devices (Postman-testable).
pushRouter.post('/test', async (req, res) => {
  try {
    if (!isPushConfigured()) {
      res.status(503).json({ error: 'Push is not configured on the server.' })
      return
    }
    await sendToCustomer(req.auth!.sub, {
      title: 'BrewPoints',
      body: "Notifications are on — we'll let you know when a coffee's on us.",
      url: '/',
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Something went wrong on our end.' })
  }
})
