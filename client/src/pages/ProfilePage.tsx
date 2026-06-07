import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { InstallButton } from '../components/InstallButton'
import { NotificationToggle } from '../components/NotificationToggle'
import { useAuth } from '../auth/auth-context'
import type { SessionCustomer } from '../session/storage'
import { apiDelete, apiGet, apiPatch } from '../lib/api'

export function ProfilePage() {
  const { session, logout, applySession } = useAuth()
  const [stats, setStats] = useState({
    cups: 0,
    free: 0,
    stamps: session?.customer.stampBalance ?? 0,
  })

  // Edit (Update) state
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(session?.customer.name ?? '')
  const [phone, setPhone] = useState(session?.customer.phone ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Delete state
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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

  const startEdit = () => {
    setName(c.name)
    setPhone(c.phone ?? '')
    setError(null)
    setEditing(true)
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const { customer } = await apiPatch<{ customer: SessionCustomer }>('/api/me', session.token, {
        name,
        phone: phone.trim() === '' ? null : phone,
      })
      await applySession({ ...session, customer })
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your changes.')
    } finally {
      setBusy(false)
    }
  }

  const deleteAccount = async () => {
    setBusy(true)
    setError(null)
    try {
      await apiDelete('/api/me', session.token)
      await logout()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete your account.')
      setBusy(false)
    }
  }

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

      {/* Account fields — read view or edit form */}
      {!editing ? (
        <>
          <ul className="mt-5 overflow-hidden rounded-bp-card border border-bp-card-border bg-bp-card">
            <li className="px-[20px] py-[14px]">
              <div className="text-bp-label uppercase text-bp-stone">Name</div>
              <div className="mt-[4px] text-[14px] text-bp-ink">{c.name}</div>
            </li>
            <li className="border-t border-bp-divider px-[20px] py-[14px]">
              <div className="text-bp-label uppercase text-bp-stone">Email</div>
              <div className="mt-[4px] text-[14px] text-bp-ink">{c.email}</div>
            </li>
            <li className="border-t border-bp-divider px-[20px] py-[14px]">
              <div className="text-bp-label uppercase text-bp-stone">Phone</div>
              <div className={`mt-[4px] text-[14px] ${c.phone ? 'text-bp-ink' : 'text-bp-stone'}`}>
                {c.phone ?? "Not added — that's fine"}
              </div>
            </li>
          </ul>
          <button
            type="button"
            onClick={startEdit}
            className="mt-3 w-full rounded-bp-button border border-bp-ink px-4 py-3 text-[14px] text-bp-ink"
          >
            Edit details
          </button>
        </>
      ) : (
        <div className="mt-5 rounded-bp-card border border-bp-card-border bg-bp-card p-[20px]">
          <label className="block text-bp-label uppercase text-bp-stone">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-[6px] w-full rounded-bp-button border border-bp-card-border bg-bp-paper px-3 py-2 text-[14px] text-bp-ink"
          />
          <label className="mt-4 block text-bp-label uppercase text-bp-stone">Phone (optional)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Leave blank — that's fine"
            className="mt-[6px] w-full rounded-bp-button border border-bp-card-border bg-bp-paper px-3 py-2 text-[14px] text-bp-ink placeholder:text-bp-stone"
          />
          <div className="mt-2 text-[13px] text-bp-stone">Email can’t be changed.</div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="flex-1 rounded-bp-button bg-bp-ink px-4 py-3 text-[14px] text-bp-paper disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setError(null)
              }}
              disabled={busy}
              className="flex-1 rounded-bp-button border border-bp-ink px-4 py-3 text-[14px] text-bp-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-3 text-[13px] text-bp-alert">{error}</div>}

      <NotificationToggle token={session.token} />

      <InstallButton />

      {/* Delete account (CRUD: Delete) — destructive, requires a confirm step. */}
      <div className="mt-8 border-t border-bp-divider pt-6">
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mx-auto block text-[13px] text-bp-stone underline"
          >
            Delete my account
          </button>
        ) : (
          <div className="rounded-bp-card border border-bp-card-border bg-bp-card p-[20px] text-center">
            <div className="text-[14px] text-bp-ink">Delete your account?</div>
            <div className="mt-[6px] text-[13px] text-bp-stone">
              This removes your stamps and history for good. It can’t be undone.
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={busy}
                className="flex-1 rounded-bp-button bg-bp-ink px-4 py-3 text-[14px] text-bp-paper disabled:opacity-50"
              >
                {busy ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="flex-1 rounded-bp-button border border-bp-ink px-4 py-3 text-[14px] text-bp-ink disabled:opacity-50"
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>

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
