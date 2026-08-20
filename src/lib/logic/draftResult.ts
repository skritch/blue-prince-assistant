import type { Room } from "../types"


export interface DraftOdds {
  room: Room
  /** Probability this room appears as one of the 3 draft choices (0–1) */
  probability: number
  /** Whether this room is currently in the pool */
  inPool: boolean
  /** Why it's excluded, if applicable */
  exclusionReason?: string
}
