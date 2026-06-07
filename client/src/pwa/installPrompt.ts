// PWA "Add to home screen" support.
// The browser fires `beforeinstallprompt` once — often before React mounts — so we capture it at
// module load and expose it through a tiny external store (consumed via useSyncExternalStore).
// iOS Safari never fires the event, so callers fall back to manual Share-sheet instructions.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  canInstall: boolean // a native install prompt is available right now
  installed: boolean // already running as an installed / standalone app
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes its own standalone flag instead of display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// Cached snapshot — useSyncExternalStore needs a stable reference when nothing changed.
let snapshot: InstallState = { canInstall: false, installed: isStandalone() }

function update(next: Partial<InstallState>): void {
  snapshot = { ...snapshot, ...next }
  for (const l of listeners) l()
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function getSnapshot(): InstallState {
  return snapshot
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  await deferred.prompt()
  const choice = await deferred.userChoice
  deferred = null // each captured prompt can only be used once
  update({ canInstall: false })
  return choice.outcome
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // stop Chrome's mini-infobar; we drive the prompt from our own button
    deferred = e as BeforeInstallPromptEvent
    update({ canInstall: true })
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    update({ canInstall: false, installed: true })
  })
}
