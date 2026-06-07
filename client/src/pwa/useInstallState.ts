import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe, type InstallState } from './installPrompt'

// Subscribe to the PWA install store (beforeinstallprompt / appinstalled / standalone).
export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
