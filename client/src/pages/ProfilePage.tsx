import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { InstallButton } from '../components/InstallButton'
import { useAuth } from '../auth/auth-context'
import { apiGet } from '../lib/api'

export function ProfilePage() {
  const { session, logout } = useAuth()
  const [stats, setStats] = useState({
    cups: 0,
    free: 0,
    stamps: session?.customer.stampBalance ?? 0,
  })

  useEffect(() => {
    if (!session) return
    const token = session.token
    void Promise.all([
      apiGet<{ customer: { stampBalance: number } }>('/api/me', token),
      apiGet<{ transactions: { stampValue: number }[] }>('/api/me/transactions', token),
      apiGet<{ redemptions: unknown[] }>('/api/me/redemptions', token),
    ])
      .then(([me, tx, rd]) => {
        const cups = tx.transactions
          .filter((t) => t.stampValue > 0)
          .reduce((sum, t) => sum + t.stampValue, 0)
        setStats({ cups, free: rd.redemptions.length, stamps: me.customer.stampBalance })
      })
      .catch(() => {
        /* offline: keep snapshot */
      })
  }, [session])

  if (!session) return null
  const c = session.customer

  const fields: { label: string; value: string; muted?: boolean }[] = [
    { label: 'Name', value: c.name },
    { label: 'Email', value: c.email },
    c.phone
      ? { label: 'Phone', value: c.phone }
      : { label: 'Phone', value: "Not added — that's fine", muted: true },
  ]

  return (
    <AppShell>
      <div className="text-bp-eyebrow text-bp-stone uppercase">You</div>
      <h1 className="mt-[6px] text-[26px] font-medium tracking-[-0.02em]">Your account.</h1>

      {/* Ink stats card (D.4.2) — three Georgia-italic figures. */}
      <section className="mt-5 grid grid-cols-3 rounded-bp-card bg-bp-ink p-[24px_20px] text-bp-paper">
        {[
          { n: stats.cups, label: 'cups' },
          { n: stats.free, label: 'free' },
          { n: stats.stamps, label: 'stamps' },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="bp-num text-[28px] leading-none text-bp-paper">{stat.n}</div>
            <div className="mt-2 text-bp-label uppercase text-bp-paper opacity-60">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Account fields */}
      <ul className="mt-5 overflow-hidden rounded-bp-card border border-bp-card-border bg-bp-card">
        {fields.map((f, i) => (
          <li key={f.label} className={`px-[20px] py-[14px] ${i > 0 ? 'border-t border-bp-divider' : ''}`}>
            <div className="text-bp-label uppercase text-bp-stone">{f.label}</div>
            <div className={`mt-[4px] text-[14px] ${f.muted ? 'text-bp-stone' : 'text-bp-ink'}`}>
              {f.value}
            </div>
          </li>
        ))}
      </ul>

      <InstallButton />

      <button
        type="button"
        onClick={() => void logout()}
        className="mx-auto mt-8 block text-[13px] text-bp-stone"
      >
        Sign out
      </button>
    </AppShell>
  )
}
