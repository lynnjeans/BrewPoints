import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

// Shared customer layout: scrollable content + fixed bottom nav. Page background stays paper;
// individual cards (e.g. the full-state coffee card) handle their own inversion.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bp-paper text-bp-ink">
      <main className="flex-1 px-bp-page py-[24px]">
        <div className="mx-auto max-w-sm">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
