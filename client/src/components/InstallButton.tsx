import { useState } from 'react'
import { useInstallState } from '../pwa/useInstallState'
import { isIos, promptInstall } from '../pwa/installPrompt'

// "Add to home screen" — drives the captured beforeinstallprompt on Chrome/Android/desktop,
// and falls back to manual Share-sheet instructions on iOS Safari (which has no install event).
// Renders nothing once the app is installed or when no install path is available.
export function InstallButton() {
  const { canInstall, installed } = useInstallState()
  const [showHint, setShowHint] = useState(false)

  if (installed) return null

  const buttonClass =
    'w-full rounded-bp-button border border-bp-ink bg-transparent p-[14px] text-[14px] font-medium text-bp-ink'

  // iOS: no native prompt — offer the Share → Add to Home Screen steps.
  if (!canInstall) {
    if (!isIos()) return null
    return (
      <div className="mt-8">
        <button type="button" onClick={() => { setShowHint((v) => !v) }} className={buttonClass}>
          Add to home screen
        </button>
        {showHint && (
          <p className="mt-3 text-[13px] leading-relaxed text-bp-stone">
            In Safari, tap the Share button, then choose “Add to Home Screen.” BrewPoints opens like
            an app — and your QR works offline.
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void promptInstall()}
      className={`mt-8 ${buttonClass}`}
    >
      Add to home screen
    </button>
  )
}
