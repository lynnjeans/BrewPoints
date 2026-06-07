import { useEffect, useState, type ReactNode } from 'react'
import { onApiAuthError } from '../lib/api'
import { clearSession, loadSession, saveSession, type Session } from '../session/storage'
import { AuthContext, type AuthState } from './auth-context'

const API = '/api/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void loadSession().then((stored) => {
      setSession(stored ?? null)
      setReady(true)
    })
  }, [])

  // Auto-logout when a customer request reports the session is invalid (401, or a stale-token 404
  // on /api/me). Clearing the session makes RequireAuth redirect to /login. Self-cleans old tokens.
  useEffect(
    () =>
      onApiAuthError((path) => {
        if (path.startsWith('/api/me')) {
          void clearSession().then(() => setSession(null))
        }
      }),
    [],
  )

  async function authRequest(path: 'login' | 'register', body: unknown): Promise<void> {
    const res = await fetch(`${API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as Session & { error?: string }
    if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
    await saveSession(data)
    setSession(data)
  }

  const value: AuthState = {
    session,
    login: (email, password) => authRequest('login', { email, password }),
    register: (name, email, phone, password) =>
      authRequest('register', { name, email, phone, password }),
    applySession: async (incoming) => {
      await saveSession(incoming)
      setSession(incoming)
    },
    logout: async () => {
      await clearSession()
      setSession(null)
    },
  }

  // Wait for the persisted session to load before rendering routes (avoids a login flash).
  if (!ready) return <div className="min-h-screen bg-bp-paper" />

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
