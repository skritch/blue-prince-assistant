import type { Direction, RoomColor, GridTile, TileRow, Rarity } from './types'

import rawRarityProbabilities from './data/rarityProbabilities.json'


// TODO: better type?
const RARITY_PROBABILITIES = rawRarityProbabilities as unknown as Record<string, Record<'byRank', [number, number, number, number][]>>

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


function rareCheckSlot2Chance(gems: number, rank: number) {
  if (gems >= 4) {
    if (rank >= 7) {
      return 0.5926
    } else if (rank >= 5) {
      return 0.4188
    } else if (rank >= 3) {
      return 0.2240
    } else {
      return 0.03
    }
  } else if (gems >= 1) {
    if (rank >= 8) {
      return 0.4135
    } else if (rank >= 5) {
      return 0.1621
    } else if (rank >= 2) {
      return 0.069
    } else {
      return 0.02
    }
  } else {
    if (rank >= 8) {
      return 0.3232
    } else if (rank >= 5) {
      return 0.1540
    } else if (rank >= 2) {
      return 0.06
    } else {
      return 0
    }
  }
}

function rareCheckSlot3Chance(gems: number, roomsDrafted: number, rank: number) {
  if (roomsDrafted < 2) {
    if (gems < 2) { return 0 }
    else { return 0.2 }
  } else if (roomsDrafted < 5 && gems < 2) {
    return 0.2
  }
  if (rank >= 7) {
    return 0.9375
  } else if (rank >= 75) {
    return 0.875
  } else if (rank >= 1) {
    return 0.75
  } else {
    return 0
  }
}

export function getRareChecks(gems: number, roomsDrafted: number, rank: TileRow, day: number, vMode: boolean) {
  if (
    (vMode && roomsDrafted < 3)
    || (day == 1 && roomsDrafted < 6)
    || (day == 2 && roomsDrafted < 5)
    || (day == 3 && roomsDrafted < 4)
  ) return [false, false]

  const slot2chance = rareCheckSlot2Chance(gems, rank)
  const slot3chance = rareCheckSlot3Chance(gems, roomsDrafted, rank)

  // If slot 2 gets a rare check, slot 3 automatically does
  // Scale down slot3chance by chance 1 - slot2chance
  return [slot2chance, (1 - slot2chance) * slot3chance]
}

export function getRarityProbability(
  day: number,
  slot: 1 | 2 | 3,
  rank: TileRow,
  rarity: Rarity,
  solarium: boolean = false
) {
  if (rarity == null) {
    return 0
  }

  // TODO: add library
  const rankRow = rank - 1
  const rarityRow = rarity - 1
  let week: string
  if (day < 8) { week = '1' }
  else if (day < 15) { week = '2' }
  else { week = '3plus' }

  if (slot == 1) {
    return RARITY_PROBABILITIES[`week${week}_slot1`]['byRank'][rankRow][rarityRow]
  }
  if (solarium) {
    return RARITY_PROBABILITIES["solarium_slots23"]['byRank'][rankRow][rarityRow]
  }
  return RARITY_PROBABILITIES[`week${week}_slot23`]['byRank'][rankRow][rarityRow]
}