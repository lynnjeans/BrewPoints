import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import type { Session } from '../session/storage'

function decodeBase64Url(value: string): string {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Lands here after Google OAuth (the backend redirects with the session in the URL fragment).
export function AuthCallbackPage() {
  const { applySession } = useAuth()
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const encoded = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('session')
    if (!encoded) {
      navigate('/login?error=google_failed', { replace: true })
      return
    }
    try {
      const session = JSON.parse(decodeBase64Url(encoded)) as Session
      void applySession(session).then(() => navigate('/card', { replace: true }))
    } catch {
      navigate('/login?error=google_failed', { replace: true })
    }
  }, [applySession, navigate])

  return <div className="min-h-screen bg-bp-paper" />
}
