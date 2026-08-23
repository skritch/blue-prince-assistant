import {
  initGameState,
  addRoom,
  removeRoom,
  type GameState,
  type DayState,
  type HouseState,
  type DraftParams,
  type Rarity,
} from 'bp-logic'

const FORMAT_VERSION = 1
const STORAGE_KEY = 'bp-drafter-state'
const HASH_PREFIX = 'v1:'

const GAME_FLAGS = [
  'haveWestGate',
  'haveRoom46',
  'haveTrophy',
  'foundEpsenTomb',
  'vmode',
  'curseOrDare',
] as const

type GameFlag = (typeof GAME_FLAGS)[number]

// Compute once at module load; initGameState() is deterministic
const DEFAULT_POOL_SLUGS = new Set(initGameState().pool.map((r) => r.slug))

interface Serialized {
  v: 1
  game: {
    addedSlugs: string[]
    removedSlugs: string[]
    flags: Partial<Record<GameFlag, true>>
    rarityOverrides: Record<string, Rarity>
    comAdditions: string[]
    upgrades: Record<string, string>
  }
  day: DayState
  house: HouseState
  draft?: DraftParams
}

export interface LoadedState {
  game: GameState
  day: DayState
  house: HouseState
  draft: DraftParams | undefined
}

function encodeState(
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: DraftParams | undefined,
): string {
  const currentSlugs = new Set(game.pool.map((r) => r.slug))
  const addedSlugs = [...currentSlugs].filter((s) => !DEFAULT_POOL_SLUGS.has(s))
  const removedSlugs = [...DEFAULT_POOL_SLUGS].filter((s) => !currentSlugs.has(s))

  const flags: Partial<Record<GameFlag, true>> = {}
  for (const f of GAME_FLAGS) {
    if (game[f]) flags[f] = true
  }

  const payload: Serialized = {
    v: 1,
    game: {
      addedSlugs,
      removedSlugs,
      flags,
      rarityOverrides: game.rarityOverrides,
      comAdditions: game.chamberOfMirrorsAdditions,
      upgrades: game.upgrades,
    },
    day,
    house,
    ...(draft !== undefined ? { draft } : {}),
  }

  return btoa(JSON.stringify(payload))
}

function decodeState(encoded: string): LoadedState | null {
  try {
    const data = JSON.parse(atob(encoded)) as Serialized
    if (data.v !== FORMAT_VERSION) return null

    let game = initGameState()

    for (const slug of data.game.removedSlugs ?? []) {
      game = removeRoom(game, slug)
    }
    for (const slug of data.game.addedSlugs ?? []) {
      game = addRoom(game, slug)
    }

    const flags = data.game.flags ?? {}
    for (const f of GAME_FLAGS) {
      game = { ...game, [f]: flags[f] === true }
    }

    game = {
      ...game,
      rarityOverrides: data.game.rarityOverrides ?? {},
      chamberOfMirrorsAdditions: data.game.comAdditions ?? [],
      upgrades: data.game.upgrades ?? {},
    }

    return { game, day: data.day, house: data.house, draft: data.draft }
  } catch {
    return null
  }
}

export function loadState(): LoadedState | null {
  const hash = location.hash.slice(1)
  if (hash.startsWith(HASH_PREFIX)) {
    const result = decodeState(hash.slice(HASH_PREFIX.length))
    if (result) return result
    history.replaceState(null, '', location.pathname + location.search)
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const result = decodeState(stored)
      if (result) return result
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // localStorage unavailable (e.g. private browsing with restrictions)
  }

  return null
}

export function saveState(
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: DraftParams | undefined,
): void {
  const encoded = encodeState(game, day, house, draft)
  history.replaceState(null, '', '#' + HASH_PREFIX + encoded)
  try {
    localStorage.setItem(STORAGE_KEY, encoded)
  } catch {
    // ignore
  }
}

export function persistLocally(
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: DraftParams | undefined,
): void {
  if (location.hash.startsWith('#' + HASH_PREFIX)) {
    history.replaceState(null, '', location.pathname + location.search)
  }
  try {
    localStorage.setItem(STORAGE_KEY, encodeState(game, day, house, draft))
  } catch {
    // ignore
  }
}
