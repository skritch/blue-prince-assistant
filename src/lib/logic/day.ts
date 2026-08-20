import type { RoomColor } from "../types"

/**
 * Within-day state. User-provided or derived from the existing daily state.
 * Excludes:
 *   - directory state
 *   - placed room list, per-draft conditions (location, key type)
 */
export interface DayState {
  day: number

  // Affects how many floor plans are drawn per draft
  gems: number

  // --- Dynamic pool modifiers ---
  knightChess: boolean             // Adds Armory
  aquariumExperimentActive: boolean    // (Laboratory) adds extra Aquariums to pool
  chamberOfMirrorsInHouse: boolean // adds same-day duplicates of already-placed rooms
  poolInHouse: boolean             // adds Locker Room, Sauna, Pump Room
  baconAndEggs: boolean            // adds Morning Room

  // --- Dynamic rarity modifiers ---
  chessColor: RoomColor | null    // Chess piece color boost (null = inactive)
  scepterColor: RoomColor | null  // Royal Scepter color boost (null = inactive)
  furnaceInHouse: boolean          // Red rooms more likely
  greenhouseInHouse: boolean       // Green rooms more likely
  southernCrossActive: boolean     // Boosts certain rooms
  draxusActive: boolean            // Dead ends more common
  mailRoomUsed: boolean            // Mail Room rarity effect triggers after first use
  coatCheckUsed: boolean           // Coat Check rarity effect triggers after first use

  // Both
  schoolhouseInHouse: boolean      // Alters Library rarity and adds classrooms
  monk: string | null

  // Any other chess mechanics?
  // What's the mechanic that removes things from the pool? Blue crown? What else?
  // Scrubber thing
  // Day after freezer?
}
export function initDay(day: number): DayState {
  return {
    day,
    gems: 0,
    knightChess: false,
    aquariumExperimentActive: false,
    chamberOfMirrorsInHouse: false,
    poolInHouse: false,
    baconAndEggs: false,
    chessColor: null,
    scepterColor: null,
    furnaceInHouse: false,
    greenhouseInHouse: false,
    southernCrossActive: false,
    draxusActive: false,
    mailRoomUsed: false,
    coatCheckUsed: false,
    schoolhouseInHouse: false,
    monk: null
  }
}
