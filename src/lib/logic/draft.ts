import { ROOM_BY_SLUG } from '../data/rooms'
import type { Direction, Rarity, Room, RoomColor } from '../types'



/**
 * Draft state.
 */
export interface DraftParams {
  location: string  // A7, e.g.
  direction: Direction

  // determines duct drafting, library, reading nook, tunnel, bookshop
  fromRoom: string
  silverKeyUsed: boolean
  prismKeyColor: RoomColor | null
  secretPassage: Exclude<RoomColor, 'black' | 'blue'> | null

  // No need for room 8 / secret garden keys

  // Can't see the same room two times in a row or something
  // Except sometimes you can
  previousDraft: string[]


  // Buggy stuff
  // - drafting blocks: greenhouse, secret passags, tunnel
}


/**
 * Dynamically-computed pool for a specific draft, after all state effects are applied.
 * Intermediate representation between the input states and final DraftOdds.
 */
export interface DraftPool {
  /** Rooms eligible to appear as draft choices at this location */
  rooms: Room[]
  /** Effective rarity for each room in this draft, slug → rarity */
  rarityOverrides: Record<string, Rarity>
}

export function addRooms(pool: DraftPool, ...slugs: string[]): DraftPool {
  // Does not check if rooms already exist, as draft pool suppors duplicates
  // Currently does not validate slugs
  const toAdd = slugs.map((s) => ROOM_BY_SLUG[s])
  if (toAdd.length === 0) return pool
  return { ...pool, rooms: [...pool.rooms, ...toAdd] }
}

export interface DraftOdds {
  room: Room
  /** Probability this room appears as one of the 3 draft choices (0–1) */
  probability: number
  /** Whether this room is currently in the pool */
  inPool: boolean
  /** Why it's excluded, if applicable */
  exclusionReason?: string
}

