import { type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/auth-context'
import { LoginPage } from './pages/LoginPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { CoffeeCardPage } from './pages/CoffeeCardPage'
import { RewardsPage } from './pages/RewardsPage'
import { HistoryPage } from './pages/HistoryPage'
import { ProfilePage } from './pages/ProfilePage'
import { StaffAuthProvider } from './staff/StaffAuthProvider'
import { useStaffAuth } from './staff/staff-auth-context'
import { StaffLoginPage } from './staff/StaffLoginPage'
import { StaffScanPage } from './staff/StaffScanPage'
import { ManagerPage } from './staff/ManagerPage'

function LoginRoute() {
  const { session } = useAuth()
  return session ? <Navigate to="/card" replace /> : <LoginPage />
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return session ? <>{children}</> : <Navigate to="/login" replace />
}

function StaffLoginRoute() {
  const { session } = useStaffAuth()
  return session ? <Navigate to="/staff/scan" replace /> : <StaffLoginPage />
}

function RequireStaff({ children }: { children: ReactNode }) {
  const { session } = useStaffAuth()
  return session ? <>{children}</> : <Navigate to="/staff/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <StaffAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer area */}
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/card" element={<RequireAuth><CoffeeCardPage /></RequireAuth>} />
            <Route path="/rewards" element={<RequireAuth><RewardsPage /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

            {/* Staff area */}
            <Route path="/staff/login" element={<StaffLoginRoute />} />
            <Route path="/staff/scan" element={<RequireStaff><StaffScanPage /></RequireStaff>} />
            <Route path="/staff/manage" element={<RequireStaff><ManagerPage /></RequireStaff>} />

            <Route path="*" element={<Navigate to="/card" replace />} />
          </Routes>
        </BrowserRouter>
      </StaffAuthProvider>
    </AuthProvider>
  )
}

export default App
