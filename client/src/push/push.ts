import { apiGet, apiPost } from '../lib/api'

// Web Push client helpers (Task 05). The service worker (Workbox + public/push-sw.js) shows the
// notifications; this module handles permission, subscribing via the browser PushManager, and
// syncing the subscription to the backend. Push only works in the built PWA (the dev server has
// no service worker — see vite.config devOptions.enabled:false).

export type PushState = 'unsupported' | 'denied' | 'disabled' | 'enabled'

// VAPID public key arrives base64url; PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'enabled' : 'disabled'
}

export async function enablePush(token: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'disabled'

  const { publicKey, enabled } = await apiGet<{ publicKey: string; enabled: boolean }>(
    '/api/push/public-key',
    token,
  )
  if (!enabled || !publicKey) {
    throw new Error('Notifications aren’t set up on the server yet.')
  }

  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) {
    throw new Error('Service worker not active — open the installed app to enable notifications.')
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
  await apiPost('/api/me/push/subscribe', token, sub.toJSON())
  return 'enabled'
}

export async function disablePush(token: string): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    // Tell the server first (so it stops sending), then unsubscribe locally.
    await apiPost('/api/me/push/unsubscribe', token, { endpoint: sub.endpoint }).catch(() => {
      /* server cleanup is best-effort; still unsubscribe locally */
    })
    await sub.unsubscribe()
  }
  return 'disabled'
}
