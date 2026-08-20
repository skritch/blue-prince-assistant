import { ADHOC_ADDITIONS, POOL_ADDITIONS, ROOMS, ROOM_46_REWARDS, ROOM_BY_SLUG, UNDRAFTABLE, roomsForPage } from '../data/rooms'
import type { Rarity, Room } from '../types'



export interface PoolState {
  // Drafting Studio, found floorplans, etc.
  pool: Room[]
  haveRoom46: boolean              // Adds Gallery, Room8, gift shop, trophy room

  // Conservatory / Gear Wrench permanent rarity shifts; slug → overridden rarity
  rarityOverrides: Record<string, Rarity>
}

// Pages excluded from the initial pool
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

export function initPool(): PoolState {
  const unlockedRooms = ROOMS
    .filter((r) => !INIT_EXCLUDED_PAGES.has(r.directoryPage) && !INIT_EXCLUDED_SLUGS.has(r.slug))
  return { pool: unlockedRooms, haveRoom46: false, rarityOverrides: {} }
}

export function initFullPool(): PoolState {
  return {
    pool: ROOMS
      .filter((r) => !FULL_EXCLUDED_SLUGS.has(r.slug)),
    haveRoom46: true,
    rarityOverrides: {},
  }
}

export function fillPage(state: PoolState, page: number): PoolState {
  const existingSlugs = new Set(state.pool.map((r) => r.slug))
  const toAdd = roomsForPage(page).filter((r) => !existingSlugs.has(r.slug))
  if (toAdd.length === 0) return state
  return { ...state, pool: [...state.pool, ...toAdd] }
}

export function addRoom(state: PoolState, slug: string): PoolState {
  const room = ROOM_BY_SLUG[slug]
  if (!room || state.pool.some((r) => r.slug === slug)) return state
  return { ...state, pool: [...state.pool, room] }
}

export function removeRoom(state: PoolState, slug: string): PoolState {
  const idx = state.pool.findIndex((r) => r.slug === slug)
  if (idx === -1) return state
  const unlockedRooms = [...state.pool]
  unlockedRooms.splice(idx, 1)
  return { ...state, pool: unlockedRooms }
}
