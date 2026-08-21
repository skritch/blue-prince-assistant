import { ROOM_BY_SLUG, UPGRADES } from './rooms'
import type { GameState } from './game'
import type { Rarity, Room, RoomColor, UpgradeSpec } from './types'


export type RoomSource =
  | 'room46'
  | 'pool-in-house'
  | 'bacon-and-eggs'
  | 'knight-chess'
  | 'schoolhouse'
  | 'laboratory'
  | 'com-permanent'
  | 'com-passive'


type ChanceInPool = { pct: number }
type MaybeMirrored = { mirrorNote: string }
type ChanceOfRarity = { rarityNote: string }
export type Annotation = ChanceInPool | MaybeMirrored | ChanceOfRarity

export interface PooledRoom {
  room: Room
  source?: RoomSource
  upgrade?: UpgradeSpec
}

function toSlug(str: string): string {
  return str.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

type RawUpgrade = { name?: string; description?: string; color?: string | string[] }
const UPGRADE_LOOKUP: Record<string, Record<string, UpgradeSpec>> = {}
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

export function fromGameState(game: GameState): DraftPool {
  return {
    rooms: game.pool.map((room) => {
      const upgradeSlug = game.upgrades[room.slug]
      const upgrade = upgradeSlug ? UPGRADE_LOOKUP[room.slug]?.[upgradeSlug] : undefined
      return { room, upgrade }
    }),
    rarityOverrides: {},
    annotations: {},
  }
}

/**
 * Dynamically-computed pool for a specific draft, after all state effects are applied.
 * Intermediate representation between the input states and final DraftOdds.
 */
export interface DraftPool {
  /** Rooms eligible to appear as draft choices at this location */
  rooms: PooledRoom[]
  /** Effective rarity for each room in this draft, slug → rarity */
  rarityOverrides: Record<string, Rarity>
  /** Annotations keyed by room slug */
  annotations: Record<string, Annotation[]>
}

export function addToPool(pool: DraftPool, slugs: string[], source?: RoomSource): DraftPool {
  // Does not check if rooms already exist, as draft pool supports duplicates
  // Currently does not validate slugs
  const toAdd = slugs.map((s) => ({ room: ROOM_BY_SLUG[s], source }))
  if (toAdd.length === 0) return pool
  return { ...pool, rooms: [...pool.rooms, ...toAdd] }
}

// TODO: do we need to remove one?
export function removeFromPool(pool: DraftPool, slugs: string[]): DraftPool {
  const toRemove = new Set(slugs)
  return { ...pool, rooms: pool.rooms.filter(({ room }) => !toRemove.has(room.slug)) }
}

export function annotateRoom(pool: DraftPool, annotation: Annotation, ...slugs: string[]): DraftPool {
  const updated = { ...pool.annotations }
  for (const slug of slugs) {
    updated[slug] = [...(updated[slug] ?? []), annotation]
  }
  return { ...pool, annotations: updated }
}
