export interface SpoilerSettings {
  westGate: boolean
  antechamber: boolean
  room46: boolean
  allRooms: boolean
  allItems: boolean
  precipiceAccessed: boolean
  precipiceSolved: boolean
  giftShop: boolean
  entireGame: boolean
}

export function initSpoilerSettings(): SpoilerSettings {
  return {
    westGate: false,
    antechamber: false,
    room46: false,
    allRooms: false,
    allItems: false,
    precipiceAccessed: false,
    precipiceSolved: false,
    giftShop: false,
    entireGame: false,
  }
}

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
