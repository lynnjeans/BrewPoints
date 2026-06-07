import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { GoogleIcon } from '../components/GoogleIcon'
import { useAuth } from '../auth/auth-context'

type Mode = 'signin' | 'register'

const inputClass =
  'w-full bg-bp-card border border-bp-card-border rounded-[12px] px-[14px] py-[13px] text-[14px] placeholder:text-bp-stone'

const GOOGLE_ERRORS: Record<string, string> = {
  google_unconfigured: 'Google sign-in isn’t set up yet — use email for now.',
  google_email: 'We couldn’t get a verified email from Google.',
  google_state: 'That sign-in attempt expired — give it another go.',
}

export function LoginPage() {
  const { login, register } = useAuth()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const googleError = params.get('error')
  const [error, setError] = useState(
    googleError ? (GOOGLE_ERRORS[googleError] ?? 'Google sign-in didn’t work — try again.') : '',
  )
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') {
        await register(name, email, phone.trim() === '' ? null : phone, password)
      } else {
        await login(email, password)
      }
      // On success the router redirects to /card (see App routes).
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  function onGoogle() {
    // Full-page redirect into the backend OAuth flow (Task 2.2). Returns to /auth/callback.
    window.location.href = '/api/auth/google'
  }

  return (
    <div className="min-h-screen bg-bp-paper px-bp-page py-[48px] font-sans text-bp-ink">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <Logo size={56} className="text-bp-ink" />
        <h1 className="mt-4 text-[26px] font-medium tracking-[-0.02em]">BrewPoints</h1>
        <p className="mt-2 text-center font-serif text-[13px] italic text-bp-stone">
          Your coffee card, minus the cardboard.
        </p>

        <div className="mt-8 w-full bg-bp-card border border-bp-card-border rounded-bp-card p-[22px_20px]">
          <button
            type="button"
            onClick={onGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-bp-button bg-bp-ink px-4 py-4 text-[14px] font-medium tracking-[0.02em] text-bp-paper"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-bp-card">
              <GoogleIcon />
            </span>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-bp-card-border" />
            <span className="text-[12px] text-bp-stone">or</span>
            <span className="h-px flex-1 bg-bp-card-border" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (or a nickname)"
                autoComplete="name"
              />
            )}
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.co.nz"
              autoComplete="email"
            />
            {mode === 'register' && (
              <div>
                <input
                  className={inputClass}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  autoComplete="tel"
                />
                <p className="mt-[6px] text-[12px] text-bp-stone">
                  Phone is optional — we ask nothing you don’t want to share.
                </p>
              </div>
            )}
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />

            {error && <p className="text-[13px] text-bp-alert">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-bp-button border border-bp-ink bg-transparent p-[14px] text-[14px] font-medium text-bp-ink disabled:opacity-50"
            >
              {mode === 'register' ? 'Create account' : 'Sign in with email'}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'register' : 'signin')
            setError('')
          }}
          className="mt-5 text-[13px] text-bp-stone"
        >
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>

        <Link to="/staff/login" className="mt-8 text-[12px] text-bp-stone underline">
          Staff sign-in
        </Link>
      </div>
    </div>
  )
}
