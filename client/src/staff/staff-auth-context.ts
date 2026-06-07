import { createContext, useContext } from 'react'
import type { StaffSession } from '../session/staff-storage'

export interface StaffAuthState {
  session: StaffSession | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const StaffAuthContext = createContext<StaffAuthState | null>(null)

export function useStaffAuth(): StaffAuthState {
  const ctx = useContext(StaffAuthContext)
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider')
  return ctx
}
