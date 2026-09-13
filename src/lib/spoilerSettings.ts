import { initSpoilerSettings, type SpoilerSettings } from 'bp-logic'

const SETTINGS_KEY = 'bp-spoiler-settings'

export function loadSpoilerSettings(): SpoilerSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SpoilerSettings>
      return { ...initSpoilerSettings(), ...parsed }
    }
  } catch {
    // ignore
  }
  return initSpoilerSettings()
}

export function saveSpoilerSettings(settings: SpoilerSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}
