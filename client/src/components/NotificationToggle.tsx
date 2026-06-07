import { useEffect, useState } from 'react'
import { disablePush, enablePush, getPushState, type PushState } from '../push/push'

// Profile control to opt in/out of Web Push (Task 05). Hidden where push isn't supported
// (e.g. the dev server with no service worker, or browsers without PushManager).
export function NotificationToggle({ token }: { token: string }) {
  const [state, setState] = useState<PushState | 'loading'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getPushState()
      .then(setState)
      .catch(() => setState('disabled'))
  }, [])

  if (state === 'loading' || state === 'unsupported') return null

  const enabled = state === 'enabled'
  const denied = state === 'denied'

  const onToggle = async () => {
    setBusy(true)
    setError(null)
    try {
      setState(enabled ? await disablePush(token) : await enablePush(token))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change notifications.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-5 rounded-bp-card border border-bp-card-border bg-bp-card px-[20px] py-[14px]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[14px] text-bp-ink">Notifications</div>
          <div className="mt-[2px] text-[13px] text-bp-stone">
            {denied
              ? 'Blocked in your browser settings.'
              : enabled
                ? "On — we'll nudge you when a coffee's on us."
                : 'Get a nudge when you earn a stamp or a reward’s ready.'}
          </div>
        </div>
        {!denied && (
          <button
            type="button"
            onClick={() => void onToggle()}
            disabled={busy}
            className="shrink-0 rounded-bp-button border border-bp-ink px-4 py-2 text-[13px] text-bp-ink disabled:opacity-50"
          >
            {busy ? '…' : enabled ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>
      {error && <div className="mt-2 text-[13px] text-bp-alert">{error}</div>}
    </section>
  )
}
