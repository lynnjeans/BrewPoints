import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { MemberQr } from '../qr/MemberQr'
import { useAuth } from '../auth/auth-context'
import { apiGet } from '../lib/api'

const GOAL = 10

interface RedemptionEntry {
  redemptionId: number
  rewardName: string
  stampsUsed: number
  redeemedAt: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

export function RewardsPage() {
  const { session } = useAuth()
  const [balance, setBalance] = useState(session?.customer.stampBalance ?? 0)
  const [redemptions, setRedemptions] = useState<RedemptionEntry[]>([])
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    if (!session) return
    const token = session.token
    void apiGet<{ customer: { stampBalance: number } }>('/api/me', token)
      .then((d) => setBalance(d.customer.stampBalance))
      .catch(() => {
        /* offline: keep cached balance */
      })
    void apiGet<{ redemptions: RedemptionEntry[] }>('/api/me/redemptions', token)
      .then((d) => setRedemptions(d.redemptions))
      .catch(() => {
        /* offline: leave history empty */
      })
  }, [session])

  if (!session) return null

  const earned = Math.min(balance, GOAL)
  const ready = balance >= GOAL

  return (
    <AppShell>
      <div className="text-bp-eyebrow text-bp-stone uppercase">Rewards</div>
      <h1 className="mt-[6px] text-[26px] font-medium tracking-[-0.02em]">Your coffees earned.</h1>

      {/* Progress card — 10-segment bar (D.4.6), NOT the koru (that's the coffee card only). */}
      <section className="mt-5 rounded-bp-card border border-bp-card-border bg-bp-card p-[22px_20px]">
        <div className="flex items-baseline justify-between">
          <span className="text-bp-card-h font-medium">Free regular coffee</span>
          <span className="text-[13px] text-bp-stone">
            <span className="bp-num text-bp-ink">{earned}</span> / {GOAL}
          </span>
        </div>

        <div className="mt-4 flex gap-[5px]">
          {Array.from({ length: GOAL }).map((_, i) => (
            <div
              key={i}
              className={`h-[6px] flex-1 rounded-[3px] ${i < earned ? 'bg-bp-fern' : 'bg-bp-stone-light'}`}
            />
          ))}
        </div>

        {ready ? (
          showCode ? (
            <div className="mt-5">
              <MemberQr
                membershipId={session.customer.membershipId}
                qrSeed={session.qrSeed}
                intent="redeem"
              />
              <button
                type="button"
                onClick={() => setShowCode(false)}
                className="mt-4 w-full rounded-bp-button border border-bp-ink bg-transparent p-[14px] text-[14px] font-medium text-bp-ink"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCode(true)}
              className="mt-5 w-full rounded-bp-button bg-bp-clay p-[18px] text-[15px] font-medium text-bp-paper"
            >
              Redeem free coffee
            </button>
          )
        ) : (
          <p className="mt-4 text-[13px] text-bp-stone">
            Not available yet — {GOAL - balance} more to go.
          </p>
        )}
      </section>

      {/* Redemption history */}
      <div className="mt-8 text-bp-eyebrow text-bp-stone uppercase">Your shouts so far</div>
      {redemptions.length === 0 ? (
        <p className="mt-3 text-[13px] text-bp-stone">Nothing yet — your first one’s coming.</p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-bp-card-sm border border-bp-card-border bg-bp-card">
          {redemptions.map((r, i) => (
            <li
              key={r.redemptionId}
              className={`flex items-center justify-between px-[18px] py-[14px] ${
                i > 0 ? 'border-t border-bp-divider' : ''
              }`}
            >
              <span className="text-[14px]">{r.rewardName}</span>
              <span className="bp-num text-[13px] text-bp-stone">{formatDate(r.redeemedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
