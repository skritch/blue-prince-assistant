import type { RoomColor } from "./types"

/**
 * Within-day state. User-provided or derived from the existing daily state.
 * Excludes:
 *   - directory state
 *   - placed room list, per-draft conditions (location, key type)
 */
export interface DayState {
  day: number


  // --- Items ---
  baconAndEggs: boolean            // adds Morning Room
  haveBatteryPack: boolean
  haveGearWrench: boolean
  haveElectromagnet: boolean
  haveChronograph: boolean
  haveHallPass: boolean
  scepterColor: RoomColor | null   // Royal Scepter color boost (null = inactive)

  // Chess
  knightChess: boolean             // Adds Armory
  chessColor: RoomColor | null     // Chess piece color boost (null = inactive)

  // --- Constellations---
  southernCrossActive: boolean     // Boosts certain rooms
  draxusActive: boolean            // Dead ends more common

  // --- Item Rooms ---
  mailRoomUsed: boolean            // Mail Room rarity effect triggers after first use
  coatCheckUsed: boolean           // Coat Check item available(affects rarity)

  // --- Minor---
  boilerActivated: boolean         // Boiler Room has been activated this day
  coatCheckDraftedToday: number    // Times Coat Check room has been drafted today
  aquariumExperimentActivations: number | null    // (Laboratory) adds extra Aquariums to pool
  pawnChessKnight: boolean         // Also adds Armory, but slightly different

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
    haveHallPass: false,
    boilerActivated: false,
    mailRoomUsed: false,
    coatCheckUsed: false,
    coatCheckDraftedToday: 0,
  }
}
