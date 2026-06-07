import { useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api'

interface StaffRow {
  staffId: number
  name: string
  email: string
  role: string
  createdAt: string
}

const inputClass =
  'w-full rounded-bp-button border border-bp-card-border bg-bp-paper px-3 py-2 text-[14px] text-bp-ink'

// Manager-only staff CRUD (Task 03). Lives inside the manager page.
export function StaffManager({ token, currentStaffId }: { token: string; currentStaffId: number }) {
  const [rows, setRows] = useState<StaffRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    void apiGet<{ staff: StaffRow[] }>('/api/manager/staff', token)
      .then((d) => setRows(d.staff))
      .catch(() => setError('Could not load staff.'))
  }
  useEffect(load, [token])

  const remove = async (staffId: number) => {
    setBusy(true)
    setError(null)
    try {
      await apiDelete(`/api/manager/staff/${String(staffId)}`, token)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that staff member.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <div className="text-bp-eyebrow text-bp-stone uppercase">Staff</div>
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v)
            setEditingId(null)
          }}
          className="text-[13px] text-bp-stone underline"
        >
          {adding ? 'Close' : 'Add staff'}
        </button>
      </div>

      {error && <p className="mt-2 text-[13px] text-bp-alert">{error}</p>}

      {adding && (
        <StaffForm
          token={token}
          onDone={() => {
            setAdding(false)
            load()
          }}
          onError={setError}
        />
      )}

      <div className="mt-2 overflow-hidden rounded-bp-card border border-bp-card-border bg-bp-card">
        {rows.length === 0 ? (
          <div className="px-[18px] py-[14px] text-[13px] text-bp-stone">No staff yet.</div>
        ) : (
          rows.map((s, i) => (
            <div key={s.staffId} className={i > 0 ? 'border-t border-bp-divider' : ''}>
              {editingId === s.staffId ? (
                <div className="px-[18px] py-[14px]">
                  <StaffEdit
                    token={token}
                    row={s}
                    onDone={() => {
                      setEditingId(null)
                      load()
                    }}
                    onCancel={() => setEditingId(null)}
                    onError={setError}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between px-[18px] py-[12px]">
                  <div>
                    <div className="text-[14px]">
                      {s.name}
                      <span className="ml-2 text-[11px] uppercase tracking-wide text-bp-stone">
                        {s.role}
                      </span>
                    </div>
                    <div className="text-[12px] text-bp-stone">{s.email}</div>
                  </div>
                  <div className="flex items-center gap-3 text-[13px]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(s.staffId)
                        setAdding(false)
                      }}
                      className="text-bp-ink underline"
                    >
                      Edit
                    </button>
                    {s.staffId !== currentStaffId && (
                      <button
                        type="button"
                        onClick={() => void remove(s.staffId)}
                        disabled={busy}
                        className="text-bp-stone underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function StaffForm({
  token,
  onDone,
  onError,
}: {
  token: string
  onDone: () => void
  onError: (m: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await apiPost('/api/manager/staff', token, { name, email, role, password })
      onDone()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not add staff.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 rounded-bp-card border border-bp-card-border bg-bp-card p-[18px]">
      <div className="grid gap-3">
        <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputClass} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="staff">staff</option>
          <option value="manager">manager</option>
        </select>
        <input
          className={inputClass}
          type="password"
          placeholder="Temporary password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="rounded-bp-button bg-bp-ink px-4 py-3 text-[14px] text-bp-paper disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add staff member'}
        </button>
      </div>
    </div>
  )
}

function StaffEdit({
  token,
  row,
  onDone,
  onCancel,
  onError,
}: {
  token: string
  row: StaffRow
  onDone: () => void
  onCancel: () => void
  onError: (m: string) => void
}) {
  const [name, setName] = useState(row.name)
  const [role, setRole] = useState(row.role)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const body: { name: string; role: string; password?: string } = { name, role }
      if (password.trim() !== '') body.password = password
      await apiPatch(`/api/manager/staff/${String(row.staffId)}`, token, body)
      onDone()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save changes.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-3">
      <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="staff">staff</option>
        <option value="manager">manager</option>
      </select>
      <input
        className={inputClass}
        type="password"
        placeholder="New password (leave blank to keep)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="flex-1 rounded-bp-button bg-bp-ink px-4 py-2 text-[13px] text-bp-paper disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-bp-button border border-bp-ink px-4 py-2 text-[13px] text-bp-ink disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
