import { ROOM_BY_SLUG, ROOMS, UPGRADE_LOOKUP, UPGRADES } from './rooms'
import { type GameState } from './game'
import type { Rarity, Room, RoomColor, Upgrade } from './types'
import type { KeyedVec } from './math'


export type RoomSource =
  | 'room46'
  | 'trophy'
  | 'pool-in-house'
  | 'bacon-and-eggs'
  | 'knight-chess'
  | 'pawn-chess'
  | 'schoolhouse'
  | 'laboratory'
  | 'com-permanent'
  | 'com-passive'
  | 'day-46'


type MaybeInPool = { inPoolPct: number, note?: string }
type ConditionalInPool = { condition: string }
type MaybeMirrored = { mirrorNote: string }
type ChanceOfRarity = { rarityNote: string }
type MaybeBlocked = { blockPct: number, blockNote: string }
export type Annotation =
  | MaybeInPool
  | MaybeMirrored
  | ChanceOfRarity
  | MaybeBlocked
  | ConditionalInPool

export interface PooledRoom {
  room: Room
  source?: RoomSource
  upgrade?: Upgrade,
  // probability of actually drafting
  // not really possible to calculate, but we use this as an intermediate value
  p: number
  pInPool?: number
  pSlot?: [number, number, number]
  pReasons?: [string, string, string]
}

export interface RemovedRoom extends PooledRoom {
  reason?: string
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
  // TODO: affix to rooms themselves?
  annotations: Record<string, Annotation[]>

  blocks: Record<string, string> // slug: reason
  removed: RemovedRoom[]
}

export function initPool(game: GameState): DraftPool {
  return {
    rooms: game.pool.map((room) => {
      const upgradeSlug = game.upgrades[room.slug]
      const upgrade = upgradeSlug ? UPGRADE_LOOKUP[room.slug]?.[upgradeSlug] : undefined
      return { room, upgrade, p: 1.0 }
    }),
    rarityOverrides: {},
    annotations: {},
    blocks: {},
    removed: []
  }
}

// For ad-hoc usage when we need to circumvent the regular pool
export function initSpecificPool(
  slugs: string[],
  upgrades: Record<string, string> = {}
): DraftPool {

  const slugSet = new Set(slugs)
  const rooms = ROOMS
    .filter((r) => slugSet.has(r.slug))

  return {
    rooms: rooms.map((room) => {
      const upgradeSlug = upgrades[room.slug]
      const upgrade = upgradeSlug ? UPGRADE_LOOKUP[room.slug]?.[upgradeSlug] : undefined
      return { room, upgrade, p: 1.0 }
    }),
    rarityOverrides: {},
    annotations: {},
    blocks: {},
    removed: []
  }
}


export function addToPool(pool: DraftPool, slugs: string[], source?: RoomSource): DraftPool {
  // Does not check if rooms already exist, as draft pool supports duplicates
  // Currently does not validate slugs
  const toAdd = slugs.map((s) => ({ room: ROOM_BY_SLUG[s], p: 1.0, source }))
  if (toAdd.length === 0) return pool
  return { ...pool, rooms: [...pool.rooms, ...toAdd] }
}

// Does not remove the room from annotations/blocks
export function removeFromPool(pool: DraftPool, slugs: string[], reason?: string): DraftPool {
  const toRemove = new Set(slugs)
  const removed = pool.rooms
    .filter(({ room }) => toRemove.has(room.slug))
    .map((pr) => { return { ...pr, reason } })
  return {
    ...pool,
    rooms: pool.rooms.filter(({ room }) => !toRemove.has(room.slug)),
    removed: [...pool.removed, ...removed]
  }
}

export function annotateRoom(pool: DraftPool, annotation: Annotation, slug: string, reason?: string): DraftPool {
  return {
    ...pool,
    annotations: {
      ...pool.annotations,
      [slug]: [...(pool.annotations[slug] ?? []), annotation]
    }
  }
}

// Blocking a draft is different from removing from the pool.
// Effectively our "pool" gives the "Exit Lists" in game paralance.
// Blocking prevents a room from being drafted without affecting the 
// exit lists directly, so effects which bypass those can draft it.
export function blockDraft(pool: DraftPool, slug: string, reason?: string) {
  const newBlocks = { ...pool.blocks, [slug]: reason }
  return {
    ...pool,
    blocked: newBlocks
  }
}


export function setProbabilities(
  pool: DraftPool,
  slots: [KeyedVec, KeyedVec, KeyedVec],
  reasons?: [Record<string, string[]>, Record<string, string[]>, Record<string, string[]>]
) {
  const finalRooms = pool.rooms
    .map((pr) => {
      return {
        ...pr,
        pSlot: slots.map((sp) => sp.get(pr.room.slug) || 0),
        pReasons: reasons !== undefined
          ? reasons.map((r) => r[pr.room.slug]?.join('\n'))
          : undefined
      } as PooledRoom
    })
  return {
    ...pool,
    rooms: finalRooms,
  }
}