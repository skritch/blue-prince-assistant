import { ROOM_BY_SLUG } from './rooms'
import type { Rarity, Room } from './types'


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

export function addToPool(pool: DraftPool, source?: RoomSource, ...slugs: string[]): DraftPool {
  // Does not check if rooms already exist, as draft pool supports duplicates
  // Currently does not validate slugs
  const toAdd = slugs.map((s) => ({ room: ROOM_BY_SLUG[s], source }))
  if (toAdd.length === 0) return pool
  return { ...pool, rooms: [...pool.rooms, ...toAdd] }
}

// TODO: do we need to remove one?
export function removeFromPool(pool: DraftPool, ...slugs: string[]): DraftPool {
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
