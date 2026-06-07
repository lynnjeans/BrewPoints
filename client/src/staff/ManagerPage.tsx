import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useStaffAuth } from './staff-auth-context'
import { StaffManager } from './StaffManager'
import { apiGet } from '../lib/api'

interface NamedRef {
  name: string
  membershipId?: string
}
interface CustomerRow {
  customerId: number
  name: string
  email: string
  membershipId: string
  authProvider: string
  stampBalance: number
  createdAt: string
}
interface TxnRow {
  transactionId: number
  stampValue: number
  transactionType: string
  createdAt: string
  customer: NamedRef
  staff: NamedRef | null
}
interface RedemptionRow {
  redemptionId: number
  rewardName: string
  stampsUsed: number
  redeemedAt: string
  customer: NamedRef
  staff: NamedRef | null
}
interface Overview {
  customers: CustomerRow[]
  transactions: TxnRow[]
  redemptions: RedemptionRow[]
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <div className="text-bp-eyebrow text-bp-stone uppercase">{title}</div>
        <div className="bp-num text-[13px] text-bp-stone">{count}</div>
      </div>
      <div className="mt-2 overflow-hidden rounded-bp-card border border-bp-card-border bg-bp-card">
        {children}
      </div>
    </section>
  )
}

export function ManagerPage() {
  const { session, logout } = useStaffAuth()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    void apiGet<Overview>('/api/manager/overview', session.token)
      .then(setData)
      .catch(() => setError('Could not load the overview.'))
  }, [session])

  if (!session) return null
  if (session.staff.role !== 'manager') return <Navigate to="/staff/scan" replace />

  return (
    <div className="min-h-screen bg-bp-paper font-sans text-bp-ink">
      <header className="flex items-center justify-between border-b border-bp-card-border px-bp-tablet py-[20px]">
        <div>
          <div className="text-bp-label uppercase text-bp-stone">Manager</div>
          <div className="mt-[3px] text-[18px] font-medium">{session.staff.name}</div>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-bp-stone">
          <Link to="/staff/scan" className="underline">
            Scan
          </Link>
          <button type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="px-bp-tablet py-[20px]">
        <div className="mx-auto max-w-2xl">
          <div className="text-bp-eyebrow text-bp-stone uppercase">Overview</div>
          <h1 className="mt-[6px] text-[26px] font-medium tracking-[-0.02em]">Store overview.</h1>
          {error && <p className="mt-3 text-[13px] text-bp-alert">{error}</p>}

          {data && (
            <>
              <Section title="Customers" count={data.customers.length}>
                {data.customers.map((c, i) => (
                  <div
                    key={c.customerId}
                    className={`flex items-center justify-between px-[18px] py-[12px] ${i > 0 ? 'border-t border-bp-divider' : ''}`}
                  >
                    <div>
                      <div className="text-[14px]">{c.name}</div>
                      <div className="text-[12px] text-bp-stone">
                        {c.membershipId} · {c.authProvider} · since {monthYear(c.createdAt)}
                      </div>
                    </div>
                    <div className="text-[13px] text-bp-stone">
                      <span className="bp-num text-bp-ink">{c.stampBalance}</span> / 10
                    </div>
                  </div>
                ))}
              </Section>

              <Section title="Recent stamps" count={data.transactions.length}>
                {data.transactions.map((t, i) => (
                  <div
                    key={t.transactionId}
                    className={`flex items-center justify-between px-[18px] py-[12px] ${i > 0 ? 'border-t border-bp-divider' : ''}`}
                  >
                    <div>
                      <div className="text-[14px]">{t.customer.name}</div>
                      <div className="text-[12px] text-bp-stone">
                        {when(t.createdAt)}
                        {t.staff ? ` · ${t.staff.name}` : ''}
                      </div>
                    </div>
                    <div className={`bp-num text-[16px] ${t.stampValue >= 0 ? 'text-bp-fern' : 'text-bp-clay'}`}>
                      {t.stampValue >= 0 ? `+${t.stampValue}` : `−${Math.abs(t.stampValue)}`}
                    </div>
                  </div>
                ))}
              </Section>

              <Section title="Redemptions" count={data.redemptions.length}>
                {data.redemptions.length === 0 ? (
                  <div className="px-[18px] py-[14px] text-[13px] text-bp-stone">No redemptions yet.</div>
                ) : (
                  data.redemptions.map((r, i) => (
                    <div
                      key={r.redemptionId}
                      className={`flex items-center justify-between px-[18px] py-[12px] ${i > 0 ? 'border-t border-bp-divider' : ''}`}
                    >
                      <div>
                        <div className="text-[14px]">{r.customer.name}</div>
                        <div className="text-[12px] text-bp-stone">
                          {r.rewardName} · {when(r.redeemedAt)}
                          {r.staff ? ` · ${r.staff.name}` : ''}
                        </div>
                      </div>
                      <div className="bp-num text-[16px] text-bp-clay">−{r.stampsUsed}</div>
                    </div>
                  ))
                )}
              </Section>
            </>
          )}

          <StaffManager token={session.token} currentStaffId={session.staff.staffId} />
        </div>
      </main>
    </div>
  )
}
