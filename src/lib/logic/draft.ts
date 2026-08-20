import { ROOM_BY_SLUG } from './rooms'
import type { Direction, Rarity, Room, RoomColor } from '../types'
import type { GridTile } from './tiles'


export interface HouseDraftParams {
  location: {
    tile: GridTile,
    direction: Direction,
  }

  // e.g. Tunnel, Library
  fromRoom: string
  silverKeyUsed: boolean
  prismKeyColor: RoomColor | null
  // No need for room 8 / secret garden keys

  // IDK what happens if you use secret passage + a key
  secretPassageColor: Exclude<RoomColor, 'black' | 'blue'> | null

  // Can't see the same room two times in a row or something
  // Except sometimes you can
  previousDraft: string[]

  // TODO: Buggy stuff
  // - drafting blocks: greenhouse, secret passags, tunnel

  // Do gems go here?
}

/**
 * Draft state.
 */
export type DraftParams = HouseDraftParams | 'outer'


