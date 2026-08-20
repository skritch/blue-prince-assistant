
import { ROOMS } from '../data/rooms'
import type { DayState } from './day'
import type { DraftOdds, DraftParams } from './draft'
import type { HouseState } from './house'
import type { PoolState } from './pool'


export function computeOdds(
  _pool: PoolState,
  _day: DayState,
  _draft: DraftParams,
  _house: HouseState,
): DraftOdds[] {
  return ROOMS.map((room) => ({
    room,
    probability: 0,
    inPool: false,
  }))
}


// Step 1: build the correct pool
// - start with PoolState
// - apply dynamic changes due to DayState: pool, bacon and eggs, chamber of mirrors, etc.
// - remove everything already in HouseState

// Step 2: determine current daily rarities
// - apply chess, furnace, greenhouse, scepter, etc.
// - mail, coat check, etc.

// Step 3: modify pool appropriately for current draft
// - based on location, direction
// - remove things used in the previous draft, maybe?

// Step 4: apply per-slot logic.
// - gems
// - silver key
// - monk, bookshop
