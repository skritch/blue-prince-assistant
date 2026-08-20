import { ROOMS } from '../data/rooms'
import type { Rarity } from '../types'



export interface PoolState {
  // Drafting Studio, found floorplans, etc.
  unlockedRooms: string[]
  haveRoom46: boolean              // Adds Gallery, Room8

  // Conservatory / Gear Wrench permanent rarity shifts; slug → overridden rarity
  rarityOverrides: Record<string, Rarity>
}

const ROOM_46_REWARD_SLUGS = ['trophy-room', 'gallery']

// Pages excluded from the initial pool
const INIT_EXCLUDED_PAGES = new Set([7, 8])

// Rooms excluded from the initial pool despite their page being included
const INIT_EXCLUDED_SLUGS = new Set([
  'gallery',
  'room-8',
  'trophy-room',
  'mount-holly-gift-shop',
  'sauna',
  'locker-room',
  'pump-room',
  'morning-room',
  'armory',
])

export function initPool(): PoolState {
  const unlockedRooms = ROOMS
    .filter((r) => !INIT_EXCLUDED_PAGES.has(r.directoryPage) && !INIT_EXCLUDED_SLUGS.has(r.slug))
    .map((r) => r.slug)
  return { unlockedRooms, haveRoom46: false, rarityOverrides: {} }
}

export function initFullPool(): PoolState {
  return {
    unlockedRooms: ROOMS.map((r) => r.slug),
    haveRoom46: true,
    rarityOverrides: {},
  }
}

export function markRoom46Complete(state: PoolState): PoolState {
  return {
    ...addRooms(state, ROOM_46_REWARD_SLUGS),
    haveRoom46: true,
  }
}

export function fillPage(state: PoolState, page: number): PoolState {
  const slugs = ROOMS.filter((r) => r.directoryPage === page).map((r) => r.slug)
  return addRooms(state, slugs)
}

export function addRoom(state: PoolState, slug: string): PoolState {
  return { ...state, unlockedRooms: [...state.unlockedRooms, slug] }
}

export function removeRoom(state: PoolState, slug: string): PoolState {
  const idx = state.unlockedRooms.indexOf(slug)
  if (idx === -1) return state
  const unlockedRooms = [...state.unlockedRooms]
  unlockedRooms.splice(idx, 1)
  return { ...state, unlockedRooms }
}

function addRooms(state: PoolState, slugs: string[]): PoolState {
  const toAdd = slugs.filter((s) => !state.unlockedRooms.includes(s))
  if (toAdd.length === 0) return state
  return { ...state, unlockedRooms: [...state.unlockedRooms, ...toAdd] }
}
