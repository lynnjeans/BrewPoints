import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Scanner } from './Scanner'
import { useStaffAuth } from './staff-auth-context'
import { apiPost, isUnreachable } from '../lib/api'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Logo } from '../components/Logo'

type Phase = 'idle' | 'earn' | 'redeem' | 'success' | 'error' | 'disconnected'

interface ScannedCustomer {
  name: string
  balance: number
  membershipId: string
  memberSince: string
}

const GOAL = 10

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })
}

export function StaffScanPage() {
  const { session, logout } = useStaffAuth()
  const [phase, setPhase] = useState<Phase>('idle')
  const [customer, setCustomer] = useState<ScannedCustomer | null>(null)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooling, setCooling] = useState(false)
  const [earnMsg, setEarnMsg] = useState('')
  const [redeemMsg, setRedeemMsg] = useState('')

  if (!session) return null
  const token = session.token

  async function handleScannedText(text: string): Promise<void> {
    setEarnMsg('')
    let payload: { membershipId?: unknown; intent?: unknown; signature?: unknown }
    try {
      payload = JSON.parse(text) as typeof payload
    } catch {
      setPhase('error')
      return
    }
    if (
      typeof payload.membershipId !== 'string' ||
      typeof payload.intent !== 'string' ||
      typeof payload.signature !== 'string'
    ) {
      setPhase('error')
      return
    }
    setBusy(true)
    try {
      const res = await apiPost<{
        customerName: string
        stampBalance: number
        intent: 'earn' | 'redeem'
        memberSince: string
      }>('/api/staff/scan', token, payload)
      setCustomer({
        name: res.customerName,
        balance: res.stampBalance,
        membershipId: payload.membershipId,
        memberSince: res.memberSince,
      })
      setPhase(res.intent === 'redeem' ? 'redeem' : 'earn')
    } catch (err) {
      setPhase(isUnreachable(err) ? 'disconnected' : 'error')
    } finally {
      setBusy(false)
    }
  }

  async function earn(stamps: 1 | 2): Promise<void> {
    if (!customer || busy || cooling) return
    setBusy(true)
    try {
      const res = await apiPost<{ stampBalance: number }>('/api/staff/earn', token, {
        membershipId: customer.membershipId,
        stamps,
        idempotencyKey: crypto.randomUUID(),
      })
      setCustomer({ ...customer, balance: res.stampBalance })
      setEarnMsg(`Added. ${res.stampBalance} of ${GOAL}.`)
    } catch (err) {
      if (isUnreachable(err)) {
        setPhase('disconnected')
      } else {
        setEarnMsg(err instanceof Error ? err.message : 'Could not add stamps.')
      }
    } finally {
      setBusy(false)
      setCooling(true)
      setTimeout(() => setCooling(false), 1200)
    }
  }

  async function confirmRedemption(): Promise<void> {
    if (!customer || busy) return
    setRedeemMsg('')
    setBusy(true)
    try {
      await apiPost<{ redemptionId: number; stampBalance: number }>('/api/staff/redeem', token, {
        membershipId: customer.membershipId,
      })
      setPhase('success')
    } catch (err) {
      if (isUnreachable(err)) {
        setPhase('disconnected')
      } else {
        setRedeemMsg(err instanceof Error ? err.message : 'Could not complete the redemption.')
      }
    } finally {
      setBusy(false)
    }
  }

  function reset(): void {
    setPhase('idle')
    setCustomer(null)
    setManual('')
    setEarnMsg('')
    setRedeemMsg('')
  }

  const earned = customer ? Math.min(customer.balance, GOAL) : 0
  const redeemReady = customer ? customer.balance >= GOAL : false
  const shortBy = customer ? Math.max(0, GOAL - customer.balance) : 0

  return (
    <div className="min-h-screen bg-bp-paper font-sans text-bp-ink">
      <header className="flex items-center justify-between border-b border-bp-card-border px-bp-tablet py-[20px]">
        <div>
          <div className="text-bp-label uppercase text-bp-stone">Staff</div>
          <div className="mt-[3px] text-[18px] font-medium">{session.staff.name}</div>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-bp-stone">
          {session.staff.role === 'manager' && (
            <Link to="/staff/manage" className="underline">
              Manager
            </Link>
          )}
          <button type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="px-bp-tablet py-[20px]">
        <div className="mx-auto max-w-sm">
          {phase === 'idle' && (
            <>
              <div className="text-bp-eyebrow text-bp-stone uppercase">Scan customer</div>
              <h1 className="mt-[6px] text-[26px] font-medium tracking-[-0.02em]">
                Point at their code.
              </h1>
              <div className="mt-5">
                <ErrorBoundary
                  fallback={
                    <p className="text-center text-[12px] text-bp-stone">
                      Camera unavailable — enter the code below.
                    </p>
                  }
                >
                  <Scanner onDecode={(t) => void handleScannedText(t)} />
                </ErrorBoundary>
              </div>
              <div className="mt-6">
                <div className="text-bp-label uppercase text-bp-stone">Or enter code manually</div>
                <textarea
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  rows={3}
                  placeholder='{"membershipId":"BP-...","intent":"earn","signature":"..."}'
                  className="mt-2 w-full rounded-[12px] border border-bp-card-border bg-bp-card px-[14px] py-[10px] font-mono text-[12px] placeholder:text-bp-stone"
                />
                <button
                  type="button"
                  onClick={() => void handleScannedText(manual)}
                  disabled={busy || manual.trim() === ''}
                  className="mt-2 w-full rounded-bp-button border border-bp-ink p-[14px] text-[14px] font-medium text-bp-ink disabled:opacity-50"
                >
                  Check code
                </button>
              </div>
            </>
          )}

          {phase === 'earn' && customer && (
            <>
              {/* Earn panel (D.7.9) — no clay anywhere on this screen. */}
              <section className="rounded-bp-card border border-bp-card-border bg-bp-card p-[22px_20px]">
                <div className="text-bp-label uppercase text-bp-stone">Customer</div>
                <div className="mt-1 text-[20px] font-medium">{customer.name}</div>
                <div className="mt-1 text-[13px] text-bp-stone">
                  <span className="bp-num text-bp-ink">{customer.balance}</span> of {GOAL} stamps
                </div>

                <div className="mt-4 flex gap-[5px]">
                  {Array.from({ length: GOAL }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-[6px] flex-1 rounded-[3px] ${i < earned ? 'bg-bp-fern' : 'bg-bp-stone-light'}`}
                    />
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => void earn(1)}
                    disabled={busy || cooling}
                    className="rounded-bp-button bg-bp-ink p-[16px] text-bp-paper disabled:opacity-50"
                  >
                    <span className="bp-num text-[22px]">+1</span>{' '}
                    <span className="text-[13px]">Stamp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void earn(2)}
                    disabled={busy || cooling}
                    className="rounded-bp-button border border-bp-ink p-[16px] text-bp-ink disabled:opacity-50"
                  >
                    <span className="bp-num text-[22px]">+2</span>{' '}
                    <span className="text-[13px]">Stamps</span>
                  </button>
                </div>

                {earnMsg && <p className="mt-3 text-[13px] text-bp-stone">{earnMsg}</p>}
              </section>
              <button
                type="button"
                onClick={reset}
                className="mt-5 w-full rounded-bp-button border border-bp-ink p-[14px] text-[14px] font-medium text-bp-ink"
              >
                Scan next
              </button>
            </>
          )}

          {phase === 'redeem' && customer && (
            <>
              {/* Redemption-request banner (D.7.10): ink bg; clay star ONLY when ready (whitelist #3). */}
              <div className="flex items-center gap-3 rounded-bp-card-sm bg-bp-ink px-[18px] py-[14px] text-bp-paper">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  className={redeemReady ? 'fill-bp-clay' : 'fill-bp-paper'}
                >
                  <path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.8L12 17.3 5.8 20.8l1.6-6.8L2.2 8.9l6.9-.6z" />
                </svg>
                <div>
                  <div className="text-[13px] font-medium">Redemption request</div>
                  <div className="text-[12px] opacity-70">Customer wants their free coffee</div>
                </div>
              </div>

              {/* Customer card */}
              <section className="mt-4 rounded-bp-card border border-bp-card-border bg-bp-card p-[22px_20px]">
                <div className="text-[20px] font-medium">{customer.name}</div>
                <div className="mt-1 text-[12px] text-bp-stone">
                  Member since {formatMonth(customer.memberSince)}
                </div>
                <div className="mt-3">
                  <span className={`bp-num text-[18px] ${redeemReady ? 'text-bp-fern' : 'text-bp-ink'}`}>
                    {customer.balance}
                  </span>
                  <span className="text-[13px] text-bp-stone"> / {GOAL}</span>
                </div>
                <div className="mt-3 flex gap-[5px]">
                  {Array.from({ length: GOAL }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-[6px] flex-1 rounded-[3px] ${i < earned ? 'bg-bp-fern' : 'bg-bp-stone-light'}`}
                    />
                  ))}
                </div>
              </section>

              {/* Reward card */}
              <section className="mt-4 flex items-center justify-between rounded-bp-card border border-bp-card-border bg-bp-card p-[22px_20px]">
                <div>
                  <div className="text-bp-card-h font-medium">One free regular coffee</div>
                  <div className="mt-1 text-[12px] text-bp-stone">
                    Flat white, long black, latte, cappuccino
                  </div>
                </div>
                <div className={`bp-num text-[18px] ${redeemReady ? 'text-bp-clay' : 'text-bp-stone'}`}>
                  −{GOAL}
                </div>
              </section>

              {redeemReady ? (
                <button
                  type="button"
                  onClick={() => void confirmRedemption()}
                  disabled={busy}
                  className="mt-5 w-full rounded-bp-button bg-bp-clay p-[18px] text-[15px] font-medium text-bp-paper disabled:opacity-50"
                >
                  Confirm redemption
                </button>
              ) : (
                // D.7.14 — beige info bar only. No red, no big cross, no clay on this screen.
                <p className="mt-5 rounded-bp-card-sm bg-bp-paper-warm px-[16px] py-[14px] text-[13px] text-bp-stone">
                  Not quite there yet. {shortBy} more stamps needed for a free coffee.
                </p>
              )}

              {redeemMsg && <p className="mt-3 text-[13px] text-bp-stone">{redeemMsg}</p>}

              <button
                type="button"
                onClick={reset}
                className="mt-4 w-full rounded-bp-button border border-bp-ink p-[14px] text-[14px] font-medium text-bp-ink"
              >
                Scan next
              </button>
            </>
          )}

          {phase === 'success' && (
            <div className="relative overflow-hidden rounded-bp-card bg-bp-ink p-[44px_20px] text-center text-bp-paper">
              {/* Koru watermark — the one sanctioned decorative koru (D.8). */}
              <Logo
                size={220}
                className="pointer-events-none absolute -bottom-12 -right-12 text-bp-paper opacity-[0.06]"
              />
              <div className="relative">
                {/* Clay highlight circle (whitelist #4: redemption success). */}
                <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-bp-clay text-bp-paper">
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="mt-5 font-serif text-[18px] italic">Cheers — coffee’s on the house.</p>
                <p className="mt-2 text-[13px] opacity-70">Hand it over and you’re done.</p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-6 w-full rounded-bp-button border border-bp-paper bg-transparent p-[14px] text-[14px] font-medium text-bp-paper"
                >
                  Scan next
                </button>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center py-[40px] text-center">
              {/* D.7.13 — clay circle (whitelist scenario: staff must respond). */}
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-bp-clay text-bp-clay">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </div>
              <p className="mt-4 text-[15px]">Couldn’t read that code.</p>
              <p className="mt-1 text-[13px] text-bp-stone">Ask them to refresh it in their app.</p>
              <button
                type="button"
                onClick={reset}
                className="mt-5 rounded-bp-button border border-bp-ink px-6 py-[14px] text-[14px] font-medium text-bp-ink"
              >
                Try again
              </button>
            </div>
          )}

          {phase === 'disconnected' && (
            // D.7.15 — blocking full-screen state, highest visual weight.
            <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-bp-ink px-bp-page text-center text-bp-paper">
              <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 2l20 20" />
                <path d="M5 12.5a10 10 0 0 1 4-2.3M1 8.5a16 16 0 0 1 5-3.1M9 16a6 6 0 0 1 6 0" />
                <path d="M22 8.5a16 16 0 0 0-6.5-3.4M19 12.5a10 10 0 0 0-2-1.3" />
                <path d="M12 20h.01" />
              </svg>
              <p className="mt-5 text-[18px] font-medium">Can’t reach BrewPoints</p>
              <p className="mt-2 text-[13px] opacity-70">Check the connection and try again.</p>
              <button
                type="button"
                onClick={reset}
                className="mt-6 rounded-bp-button bg-bp-paper px-6 py-[14px] text-[14px] font-medium text-bp-ink"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
