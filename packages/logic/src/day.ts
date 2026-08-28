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
  knightChess: boolean             // Adds Armory
  pawnChessKnight: boolean         // Also adds Armory, but slightly different
  baconAndEggs: boolean            // adds Morning Room
  aquariumExperimentActivations: number | null    // (Laboratory) adds extra Aquariums to pool

  // --- Rarity biases ---
  southernCrossActive: boolean     // Boosts certain rooms
  draxusActive: boolean            // Dead ends more common
  chessColor: RoomColor | null     // Chess piece color boost (null = inactive)
  scepterColor: RoomColor | null   // Royal Scepter color boost (null = inactive)


  // --- Items ---
  haveBatteryPack: boolean
  haveGearWrench: boolean
  haveElectromagnet: boolean
  haveChronograph: boolean

  // Has subtle effects even if the Foundation has since been removed from the house
  haveDraftedFoundation: boolean

  // --- Misc ---
  mailRoomUsed: boolean            // Mail Room rarity effect triggers after first use
  coatCheckUsed: boolean           // Coat Check item available
  coatCheckDraftedToday: number    // Times Coat Check room has been drafted today (affects rarity)
}
export function initDay(day: number): DayState {
  return {
    day,
    knightChess: false,
    pawnChessKnight: false,
    baconAndEggs: false,
    aquariumExperimentActivations: null,
    southernCrossActive: false,
    draxusActive: false,
    chessColor: null,
    scepterColor: null,
    haveBatteryPack: false,
    haveGearWrench: false,
    haveElectromagnet: false,
    haveChronograph: false,
    haveDraftedFoundation: false,
    mailRoomUsed: false,
    coatCheckUsed: false,
    coatCheckDraftedToday: 0,
  }
}
