import { useEffect, useState, type ReactNode } from 'react'
import {
  clearStaffSession,
  loadStaffSession,
  saveStaffSession,
  type StaffSession,
} from '../session/staff-storage'
import { StaffAuthContext, type StaffAuthState } from './staff-auth-context'

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void loadStaffSession().then((stored) => {
      setSession(stored ?? null)
      setReady(true)
    })
  }, [])

  const value: StaffAuthState = {
    session,
    login: async (email, password) => {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json()) as StaffSession & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
      await saveStaffSession(data)
      setSession(data)
    },
    logout: async () => {
      await clearStaffSession()
      setSession(null)
    },
  }

  if (!ready) return <div className="min-h-screen bg-bp-paper" />

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>
}
