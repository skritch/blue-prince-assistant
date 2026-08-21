import type { RoomColor } from "./types"

/**
 * Within-day state. User-provided or derived from the existing daily state.
 * Excludes:
 *   - directory state
 *   - placed room list, per-draft conditions (location, key type)
 */
export interface DayState {
  day: number

  // --- Dynamic pool modifiers ---
  poolInHouse: boolean             // adds Locker Room, Sauna, Pump Room
  knightChess: boolean             // Adds Armory
  baconAndEggs: boolean            // adds Morning Room
  schoolhouseInHouse: boolean      // Alters Library rarity and adds classrooms
  chamberOfMirrorsInHouse: boolean // adds same-day duplicates of already-placed rooms
  aquariumExperimentActivations: number | null    // (Laboratory) adds extra Aquariums to pool

  // --- Rarity biases ---
  furnaceInHouse: boolean          // Red rooms more likely
  greenhouseInHouse: boolean       // Green rooms more likely
  southernCrossActive: boolean     // Boosts certain rooms
  draxusActive: boolean            // Dead ends more common
  chessColor: RoomColor | null     // Chess piece color boost (null = inactive)
  scepterColor: RoomColor | null   // Royal Scepter color boost (null = inactive)

  // --- Items ---
  haveBatteryPack: boolean
  haveGearWrench: boolean
  haveElectromagnet: boolean
  haveChronograph: boolean

  // --- Misc ---
  mailRoomUsed: boolean            // Mail Room rarity effect triggers after first use
  coatCheckUsed: boolean           // Coat Check item available
  coatCheckDraftedToday: number    // Times Coat Check room has been drafted today (affects rarity)
}
export function initDay(day: number): DayState {
  return {
    day,
    poolInHouse: false,
    knightChess: false,
    baconAndEggs: false,
    schoolhouseInHouse: false,
    chamberOfMirrorsInHouse: false,
    aquariumExperimentActivations: null,
    furnaceInHouse: false,
    greenhouseInHouse: false,
    southernCrossActive: false,
    draxusActive: false,
    chessColor: null,
    scepterColor: null,
    haveBatteryPack: false,
    haveGearWrench: false,
    haveElectromagnet: false,
    haveChronograph: false,
    mailRoomUsed: false,
    coatCheckUsed: false,
    coatCheckDraftedToday: 0,
  }
}
