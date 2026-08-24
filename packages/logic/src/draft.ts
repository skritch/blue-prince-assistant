import type { Direction, RoomColor, GridTile } from './types'


export interface HouseDraftParams {
  toLocation: {
    tile: GridTile,
    toDirection: Direction,
  }

  fromRoomSlug?: string
  gems?: number

  previousDraft?: string[]
  isFirstDraftAtDoor: boolean
  keyUsed?: 'silver' | 'secret-garden' | 'room-8' | ['prism', RoomColor]
  secretPassageColor?: Exclude<RoomColor, 'black' | 'blue'> | null
  boilerActivated?: boolean


  // TODO: Buggy stuff
  // - drafting blocks: greenhouse, secret passags, tunnel
}

/**
 * Draft state.
 */
export type DraftParams = HouseDraftParams | 'outer'


