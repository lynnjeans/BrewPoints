import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { KoruRing } from '../components/KoruRing'
import { OfflineBanner } from '../components/OfflineBanner'
import { MemberQr } from '../qr/MemberQr'
import type { QrIntent } from '../qr/signature'
import { useAuth } from '../auth/auth-context'
import { apiGet } from '../lib/api'
import { useOnline } from '../lib/useOnline'

const GOAL = 10

export function CoffeeCardPage() {
  const { session } = useAuth()
  const online = useOnline()
  const [balance, setBalance] = useState(session?.customer.stampBalance ?? 0)
  const [intent, setIntent] = useState<QrIntent>('earn')
  const [toast, setToast] = useState<number | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const balanceRef = useRef(balance)
  balanceRef.current = balance

  useEffect(() => {
    if (!session) return
    const token = session.token
    let active = true
    async function refresh() {
      try {
        const data = await apiGet<{ customer: { stampBalance: number } }>('/api/me', token)
        if (!active) return
        const next = data.customer.stampBalance
        // A stamp was just added by staff → show the D.7.12 feedback toast.
        if (next > balanceRef.current) {
          setToast(next)
          setTimeout(() => setToast(null), 3500)
        }
        setBalance(next)
        setUpdatedAt(new Date())
        if (next < GOAL) setIntent('earn')
      } catch {
        /* offline: keep the cached balance */
      }
    }
    void refresh()
    const id = setInterval(() => void refresh(), 4000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [session])

  if (!session) return null

  const full = balance >= GOAL
  const remaining = Math.max(0, GOAL - balance)

  return (
    <AppShell>
      {/* D.7.12 — add-stamp feedback toast */}
      {toast !== null && (
        <div className="fixed left-1/2 top-[24px] z-20 w-[260px] -translate-x-1/2 rounded-bp-card bg-bp-ink px-[20px] py-[14px] text-center text-bp-paper">
          <div className="bp-num text-[22px]">
            {toast} of {GOAL}
          </div>
          <div className="mt-1 text-[12px] opacity-80">
            {toast >= GOAL
              ? "Your shout's on us."
              : `${GOAL - toast} more ${GOAL - toast === 1 ? 'cup' : 'cups'} till the next one's on us.`}
          </div>
        </div>
      )}

      {!online && (
        <div className="mb-4">
          <OfflineBanner />
        </div>
      )}

      <div className="text-bp-eyebrow text-bp-stone uppercase">Your card</div>
      <h1 className="mt-[6px] text-[26px] font-medium tracking-[-0.02em]">
        Morning, {session.customer.name}.
      </h1>

      <section
        className={`mt-5 rounded-bp-card p-[24px_20px] ${
          full ? 'bg-bp-ink text-bp-paper' : 'border border-bp-card-border bg-bp-card text-bp-ink'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-bp-label uppercase ${full ? 'text-bp-paper opacity-60' : 'text-bp-stone'}`}
          >
            {session.customer.membershipId}
          </span>
          {full ? (
            <span className="rounded-full bg-bp-clay px-[10px] py-[5px] text-bp-badge uppercase text-bp-paper">
              Ready
            </span>
          ) : (
            <span className="rounded-full border border-bp-card-border bg-bp-paper px-[10px] py-[5px] text-bp-badge uppercase text-bp-ink">
              {remaining} to go
            </span>
          )}
        </div>

        <div className="mt-4">
          <KoruRing earned={balance} full={full} />
        </div>

        <p
          className={`mt-2 text-center font-serif text-[13px] italic ${
            full ? 'text-bp-paper opacity-80' : 'text-bp-stone'
          }`}
        >
          {full
            ? "Your shout's on us."
            : `${remaining} more ${remaining === 1 ? 'cup' : 'cups'}, and your shout's on us.`}
        </p>

        <div className="mt-5">
          <MemberQr membershipId={session.customer.membershipId} qrSeed={session.qrSeed} intent={intent} />
        </div>

        {full &&
          (intent === 'earn' ? (
            <button
              type="button"
              onClick={() => setIntent('redeem')}
              className="mt-4 w-full rounded-bp-button bg-bp-clay p-[18px] text-[15px] font-medium text-bp-paper"
            >
              Redeem free coffee
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIntent('earn')}
              className="mt-4 w-full rounded-bp-button border border-bp-paper bg-transparent p-[14px] text-[14px] font-medium text-bp-paper"
            >
              Back to member code
            </button>
          ))}
      </section>

      {/* Data-freshness hint only matters offline (online auto-refreshes every 4s). It labels the
          cached balance, not the QR — which is long-lived and never needs refreshing. */}
      {!online && updatedAt && (
        <p className="mt-3 text-center text-[12px] text-bp-stone">
          Balance updated {updatedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </AppShell>
  )
}
