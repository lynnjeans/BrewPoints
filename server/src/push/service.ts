import webpush from 'web-push'
import { config } from '../config.js'
import { PushSubscription } from '../db.js'

// Web Push (Task 05 — secure messaging). Payloads are encrypted end-to-end by the web-push
// library using the subscription's own P-256 ECDH keys (p256dh/auth) and signed with our VAPID
// key pair, so the push service can route but not read the message. VAPID keys live in env only.

let configured = false

/** Configure web-push from env. Safe to call at startup; no-ops (with a warning) if keys are absent. */
export function initPush(): boolean {
  const { publicKey, privateKey, subject } = config.vapid
  if (!publicKey || !privateKey) {
    console.warn('Web Push disabled: VAPID keys not set. Run `npm run vapid:generate` and fill .env.')
    return false
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export function isPushConfigured(): boolean {
  return configured
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export interface WebPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** Store (or refresh) a subscription for a customer. Keyed by endpoint so re-subscribes upsert. */
export async function saveSubscription(
  customerId: number,
  sub: WebPushSubscription,
): Promise<void> {
  await PushSubscription.updateOne(
    { endpoint: sub.endpoint },
    { $set: { customerId, endpoint: sub.endpoint, keys: sub.keys } },
    { upsert: true },
  )
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await PushSubscription.deleteOne({ endpoint })
}

/**
 * Send an encrypted notification to every device the customer has subscribed.
 * Best-effort: failures never throw to the caller (earn/redeem must not fail because push failed).
 * Dead subscriptions (404/410 Gone) are pruned automatically.
 */
export async function sendToCustomer(customerId: number, payload: PushPayload): Promise<void> {
  if (!configured) return
  const subs = await PushSubscription.find({ customerId }).lean()
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          JSON.stringify(payload),
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint: s.endpoint })
        } else {
          console.error('Push send failed:', statusCode, (err as Error).message)
        }
      }
    }),
  )
}
