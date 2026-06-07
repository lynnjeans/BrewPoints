import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

// Customer bottom nav (Appendix D.4.8): ink bar, paper icons, active tab full opacity.
const ICON = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const

const tabs: { to: string; label: string; icon: ReactNode }[] = [
  {
    to: '/card',
    label: 'Card',
    icon: (
      <svg viewBox="0 0 24 24" {...ICON}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/rewards',
    label: 'Rewards',
    icon: (
      <svg viewBox="0 0 24 24" {...ICON} strokeLinejoin="round">
        <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" {...ICON} strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'You',
    icon: (
      <svg viewBox="0 0 24 24" {...ICON} strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
]

export function BottomNav() {
  return (
    <nav className="flex justify-around bg-bp-ink px-bp-tablet pb-[30px] pt-4 text-bp-paper">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 ${isActive ? 'opacity-100' : 'opacity-55'}`
          }
        >
          {tab.icon}
          <span className="text-[10px] tracking-[0.05em]">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
