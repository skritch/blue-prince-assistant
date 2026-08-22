import type { Rarity, Room } from './types'
import rawRooms from './data/rooms.json'
import rawMirrorRooms from './data/mirrorRooms.json'
export { default as MIRROR_FLOORPLANS } from './data/mirrorFloorplans.json'
export { default as UPGRADES } from './data/upgrades.json'

const RARITY_MAP: Record<string, Rarity> = {
  commonplace: 1,
  standard: 2,
  unusual: 3,
  rare: 4,
  special: null,
}

export const ROOM_46_REWARDS = ['trophy-room', 'gallery', 'mount-holly-gift-shop']
export const POOL_ADDITIONS = ['sauna', 'locker-room', 'pump-room']
export const ADHOC_ADDITIONS = ['morning-room', 'armory']
export const UNDRAFTABLE = ['secret-garden', 'room-8', 'room-46', 'antechamber', 'entrance-hall']


export const ROOMS: Room[] = rawRooms.map((r) => ({
  ...r,
  baseRarity: RARITY_MAP[r.baseRarity] ?? null,
} as Room))

export const ROOM_BY_SLUG: Record<string, Room> = Object.fromEntries(
  ROOMS.map((r) => [r.slug, r])
)

const mirrorRooms = rawMirrorRooms as { slug: string, mirrored?: "never" | "modified" }[]
export const MIRROR_ROOMS: Record<string, { mirrored?: "never" | "modified" }> = Object.fromEntries(mirrorRooms.map(({ slug, ...rest }) => [slug, rest]))

export const OUTER_ROOMS = ROOMS
  .filter(r => r.directoryPage === 9)
  .map(r => r.slug)

export function roomsForPage(page: number): Room[] {
  return ROOMS.filter((r) => r.directoryPage === page)
}

