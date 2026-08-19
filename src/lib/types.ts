export type Rarity = 'common' | 'uncommon' | 'rare'

export interface Room {
  id: string
  name: string
  rarity: Rarity
  gemCost: number
  /** Rooms that, when placed, remove this room from the pool */
  excludedBy?: string[]
  /** Rooms that must be present for this room to appear */
  requiredBy?: string[]
  tags?: string[]
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
