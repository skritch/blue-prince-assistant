import { ROOM_BY_SLUG, UPGRADE_LOOKUP, UPGRADES } from './rooms'
import { type GameState } from './game'
import type { Rarity, Room, RoomColor, Upgrade } from './types'


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


type ChanceInPool = { pct: number }
type MaybeMirrored = { mirrorNote: string }
type ChanceOfRarity = { rarityNote: string }
type MaybeBlocked = { blockPct: number, blockNote: string }
export type Annotation =
  | ChanceInPool
  | MaybeMirrored
  | ChanceOfRarity
  | MaybeBlocked

export interface PooledRoom {
  room: Room
  source?: RoomSource
  upgrade?: Upgrade,
  p: number
  pCond: number
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

  blocks: Set<string>
  removed: RemovedRoom[]
}

export function fromGameState(game: GameState): DraftPool {
  return {
    rooms: game.pool.map((room) => {
      const upgradeSlug = game.upgrades[room.slug]
      const upgrade = upgradeSlug ? UPGRADE_LOOKUP[room.slug]?.[upgradeSlug] : undefined
      return { room, upgrade, p: 1.0, pCond: 1.0 }
    }),
    rarityOverrides: {},
    annotations: {},
    blocks: new Set<string>(),
    removed: []
  }
}

export function addToPool(pool: DraftPool, slugs: string[], source?: RoomSource): DraftPool {
  // Does not check if rooms already exist, as draft pool supports duplicates
  // Currently does not validate slugs
  const toAdd = slugs.map((s) => ({ room: ROOM_BY_SLUG[s], p: 1.0, pCond: 1.0, source }))
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

export function blockDraft(pool: DraftPool, slug: string, reason?: string) {
  const newBlocks = new Set(...pool.blocks)
  newBlocks.add(slug)

  // Remove it, but also mark as blocked.
  // Blocked rooms are still in "exit lists" and can be drafted
  // in certain ways
  pool = removeFromPool(pool, [slug], reason)
  return {
    ...pool,
    blocked: newBlocks
  }
}
