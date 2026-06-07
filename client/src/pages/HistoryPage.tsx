import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../auth/auth-context'
import { apiGet } from '../lib/api'

interface TxnEntry {
  transactionId: number
  stampValue: number
  transactionType: string
  note: string | null
  createdAt: string
}

function labelFor(t: TxnEntry): string {
  if (t.transactionType === 'Redeem') return 'Free coffee'
  if (t.transactionType === 'Earn') return t.stampValue === 2 ? 'Two coffees' : 'Coffee'
  return t.note ?? 'Adjustment'
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const fromMonday = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - fromMonday)
  return x
}

interface Group {
  label: string
  items: TxnEntry[]
}

function groupByWeek(txns: TxnEntry[]): Group[] {
  const thisWeek = startOfWeek(new Date()).getTime()
  const lastWeek = thisWeek - 7 * 24 * 60 * 60 * 1000
  const buckets: Record<string, TxnEntry[]> = { 'This week': [], 'Last week': [], Earlier: [] }
  for (const t of txns) {
    const when = new Date(t.createdAt).getTime()
    const key = when >= thisWeek ? 'This week' : when >= lastWeek ? 'Last week' : 'Earlier'
    buckets[key].push(t)
  }
  return (['This week', 'Last week', 'Earlier'] as const)
    .map((label) => ({ label, items: buckets[label] }))
    .filter((g) => g.items.length > 0)
}

function StampIcon({ positive }: { positive: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        positive ? 'border border-bp-card-border bg-bp-paper text-bp-fern' : 'bg-bp-clay-soft text-bp-clay'
      }`}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 12h14" />
        {positive && <path d="M12 5v14" />}
      </svg>
    </span>
  )
}

export function HistoryPage() {
  const { session } = useAuth()
  const [txns, setTxns] = useState<TxnEntry[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!session) return
    void apiGet<{ transactions: TxnEntry[] }>('/api/me/transactions', session.token)
      .then((d) => {
        setTxns(d.transactions)
        setUpdatedAt(new Date())
      })
      .catch(() => {
        /* offline: leave empty */
      })
  }, [session])

  if (!session) return null
  const groups = groupByWeek(txns)

  return (
    <AppShell>
      <div className="text-bp-eyebrow text-bp-stone uppercase">History</div>
      <h1 className="mt-[6px] text-[26px] font-medium tracking-[-0.02em]">Every cup so far.</h1>
      {updatedAt && (
        <p className="mt-1 text-[12px] text-bp-stone">
          Updated {updatedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}

      {groups.length === 0 ? (
        <p className="mt-4 text-[13px] text-bp-stone">No stamps yet — your first cup’s a tap away.</p>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="mt-6">
            <div className="font-serif text-[12px] italic text-bp-stone">{group.label}</div>
            <ul className="mt-2 overflow-hidden rounded-bp-card-sm border border-bp-card-border bg-bp-card">
              {group.items.map((t, i) => {
                const positive = t.stampValue >= 0
                return (
                  <li
                    key={t.transactionId}
                    className={`flex items-center gap-3 px-[18px] py-[14px] ${
                      i > 0 ? 'border-t border-bp-divider' : ''
                    }`}
                  >
                    <StampIcon positive={positive} />
                    <div className="flex-1">
                      <div className="text-[14px]">{labelFor(t)}</div>
                      <div className="bp-num text-[12px] text-bp-stone">{formatWhen(t.createdAt)}</div>
                    </div>
                    <div className={`bp-num text-[18px] ${positive ? 'text-bp-fern' : 'text-bp-clay'}`}>
                      {positive ? `+${t.stampValue}` : `−${Math.abs(t.stampValue)}`}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </AppShell>
  )
}
