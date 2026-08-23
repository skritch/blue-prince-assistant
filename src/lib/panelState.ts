const STORAGE_KEY = 'bp-drafter-panels'

function loadAll(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return {}
}

function saveAll(panels: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels))
  } catch {}
}

export function loadPanelOpen(id: string, defaultOpen: boolean): boolean {
  const all = loadAll()
  return id in all ? all[id] : defaultOpen
}

export function savePanelOpen(id: string, open: boolean): void {
  const all = loadAll()
  all[id] = open
  saveAll(all)
}
