import type { Rarity, Room, RoomColor, Upgrade } from './types'
import rawRooms from './data/rooms.json'
import rawMirrorRooms from './data/mirrorRooms.json'
import { default as UPGRADES } from './data/upgrades.json'
export { default as MIRROR_FLOORPLANS } from './data/mirrorFloorplans.json'

export { UPGRADES }

const RARITY_MAP: Record<string, Rarity | null> = {
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


function toSlug(str: string): string {
  return str.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

type RawUpgrade = { name?: string; description?: string; color?: string | string[], tags?: string[] }

export const UPGRADE_LOOKUP: Record<string, Record<string, Upgrade>> = {}

for (const [baseSlug, entry] of Object.entries(UPGRADES as Record<string, { upgrades: RawUpgrade[] }>)) {
  const bySlug: Record<string, Upgrade> = {}
  for (const u of entry.upgrades) {
    if (u.name) {
      bySlug[toSlug(u.name)] = {
        name: u.name,
        description: u.description || undefined,
        color: u.color ? ([u.color].flat() as RoomColor[]) : undefined,
        tags: u.tags
      }
    }
  }
  if (Object.keys(bySlug).length > 0) UPGRADE_LOOKUP[baseSlug] = bySlug
}
