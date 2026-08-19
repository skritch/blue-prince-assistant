export type Rarity = 'commonplace' | 'standard' | 'unusual' | 'rare' | 'special'

export type RoomColor = 'blue' | 'purple' | 'orange' | 'green' | 'gold' | 'red' | 'black' | 'multicolor'

// Numbers correspond to directory section numbers (1-9); strings for unnumbered sections
export type DirectoryPage = number | 'blackprint' | 'underground'

/** Shape of an entry in rooms.json */
export interface RoomData {
  name: string
  slug: string
  assetPath: string
  color: RoomColor | null
  baseRarity: Rarity
  baseGemCost: number
  doors: number | null
  directoryPage: DirectoryPage
  roomNumber: number
  deadEnd: boolean
}

/** Runtime room — RoomData plus any computed/derived fields */
export interface Room extends RoomData {
  /** Rooms that, when placed, remove this room from the pool */
  excludedBy?: string[]
}

export interface RunState {
  day: number
  /** Room IDs already placed in the house */
  placedRooms: Set<string>
  /** Active buff/modifier IDs */
  activeBuffs: Set<string>
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
