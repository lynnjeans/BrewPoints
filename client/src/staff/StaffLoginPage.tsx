import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useStaffAuth } from './staff-auth-context'

const inputClass =
  'w-full bg-bp-card border border-bp-card-border rounded-[12px] px-[14px] py-[13px] text-[14px] placeholder:text-bp-stone'

export function StaffLoginPage() {
  const { login } = useStaffAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      // On success the router redirects to /staff/scan.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-bp-paper px-bp-page py-[48px] font-sans text-bp-ink">
      <div className="mx-auto max-w-sm">
        <div className="text-bp-eyebrow text-bp-stone uppercase">Staff</div>
        <h1 className="mt-[6px] text-[26px] font-medium tracking-[-0.02em]">Sign in to serve.</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@brewpoints.local"
            autoComplete="email"
          />
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          {error && <p className="text-[13px] text-bp-alert">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-bp-button bg-bp-ink px-4 py-4 text-[14px] font-medium tracking-[0.02em] text-bp-paper disabled:opacity-50"
          >
            Sign in
          </button>
        </form>

        <Link to="/login" className="mt-8 block text-[12px] text-bp-stone underline">
          Customer sign-in
        </Link>
      </div>
    </div>
  )
}
