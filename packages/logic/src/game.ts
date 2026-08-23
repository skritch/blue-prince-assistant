import { ADHOC_ADDITIONS, POOL_ADDITIONS, ROOMS, ROOM_46_REWARDS, ROOM_BY_SLUG, UNDRAFTABLE, UPGRADES, roomsForPage } from './rooms'
import type { Rarity, Room, RoomColor, UpgradeSpec } from './types'



export interface GameState {
  pool: Room[]
  haveWestGate: boolean
  haveRoom46: boolean
  haveTrophy: boolean
  foundEpsenTomb: boolean
  vmode: boolean
  curseOrDare: boolean

  // Conservatory / Gear Wrench permanent rarity shifts;
  // https://www.reddit.com/r/BluePrince/comments/1lnn4y6/dynamic_rarity_room_rarity_changes_behind_the/
  // Note not all can be changed
  rarityOverrides: Record<string, Rarity>


  chamberOfMirrorsAdditions: string[]

  // slug: upgraded slug
  upgrades: Record<string, string>
}

// Directory pages excluded from the initial pool
const INIT_EXCLUDED_PAGES = new Set([7, 8])

// Rooms excluded from the initial pool despite their page being included
const INIT_EXCLUDED_SLUGS = new Set([
  ...ROOM_46_REWARDS,
  ...POOL_ADDITIONS,
  ...ADHOC_ADDITIONS,
  ...UNDRAFTABLE
])

const FULL_EXCLUDED_SLUGS = new Set([
  ...POOL_ADDITIONS,
  ...ADHOC_ADDITIONS,
  ...UNDRAFTABLE
])

export function initGameState(): GameState {
  const unlockedRooms = ROOMS
    .filter((r) => !INIT_EXCLUDED_PAGES.has(r.directoryPage) && !INIT_EXCLUDED_SLUGS.has(r.slug))
  return {
    pool: unlockedRooms,
    haveWestGate: false,
    haveRoom46: false,
    haveTrophy: false,
    foundEpsenTomb: false,
    vmode: false,
    curseOrDare: false,
    rarityOverrides: {},
    chamberOfMirrorsAdditions: [],
    upgrades: {}
  }
}

export function initGameFull(): GameState {
  return {
    pool: ROOMS
      .filter((r) => !INIT_EXCLUDED_SLUGS.has(r.slug)),
    haveWestGate: true,
    haveRoom46: true,
    haveTrophy: true,
    foundEpsenTomb: false,
    vmode: false,
    curseOrDare: false,
    rarityOverrides: {},
    chamberOfMirrorsAdditions: [],
    upgrades: {}
  }
}

export function fillPage(state: GameState, page: number): GameState {
  const existingSlugs = new Set(state.pool.map((r) => r.slug))
  const toAdd = roomsForPage(page).filter((r) => !existingSlugs.has(r.slug))
  if (toAdd.length === 0) return state
  return { ...state, pool: [...state.pool, ...toAdd] }
}

export function addRoom(state: GameState, slug: string): GameState {
  const room = ROOM_BY_SLUG[slug]
  if (!room || state.pool.some((r) => r.slug === slug)) return state
  return { ...state, pool: [...state.pool, room] }
}

export function removeRoom(state: GameState, slug: string): GameState {
  const idx = state.pool.findIndex((r) => r.slug === slug)
  if (idx === -1) return state
  const unlockedRooms = [...state.pool]
  unlockedRooms.splice(idx, 1)
  return { ...state, pool: unlockedRooms }
}

function toSlug(str: string): string {
  return str.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

type RawUpgrade = { name?: string; description?: string; color?: string | string[] }

export const UPGRADE_LOOKUP: Record<string, Record<string, UpgradeSpec>> = {}

for (const [baseSlug, entry] of Object.entries(UPGRADES as Record<string, { upgrades: RawUpgrade[] }>)) {
  const bySlug: Record<string, UpgradeSpec> = {}
  for (const u of entry.upgrades) {
    if (u.name) {
      bySlug[toSlug(u.name)] = {
        name: u.name,
        description: u.description || undefined,
        color: u.color ? ([u.color].flat() as RoomColor[]) : undefined,
      }
    }
  }
  if (Object.keys(bySlug).length > 0) UPGRADE_LOOKUP[baseSlug] = bySlug
}