import type { Direction, RoomColor, GridTile, TileRow, Rarity } from './types'

import rawRarityProbabilities from './data/rarityProbabilities.json'
import type { PooledRoom } from './pool'


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

export function getPGemBySlot(
  gems: number, 
  slot: 1 | 2 | 3,
  roomsDrafted: number,
  rank: TileRow, 
  day: number, 
  vMode: boolean
): number {
  let pGems: [number, number, number]
  if (
    (vMode && roomsDrafted < 3)
    || (day == 1 && roomsDrafted < 6)
    || (day == 2 && roomsDrafted < 5)
    || (day == 3 && roomsDrafted < 4)
  ) { 
    pGems = [0, 0, 0] 
  }

  const slot2chance = rareCheckSlot2Chance(gems, rank)
  const slot3chance = rareCheckSlot3Chance(gems, roomsDrafted, rank)

  // If slot 2 gets a rare check, slot 3 automatically does
  // Scale down slot3chance by chance 1 - slot2chance
  pGems = [0, slot2chance, (1 - slot2chance) * slot3chance]

  return pGems[slot - 1]
}

export function getRarityProbabilities(
  day: number,
  slot: 1 | 2 | 3,
  rank: TileRow,
  solarium: boolean = false
) {
  // TODO: add library
  const rankRow = rank - 1
  let week: string
  if (day < 8) { week = '1' }
  else if (day < 15) { week = '2' }
  else { week = '3plus' }

  if (solarium) {
    return RARITY_PROBABILITIES["solarium_slots23"]['byRank'][rankRow]
  }

  // Week 1 only has a single rarity table for all slots
  if (week === '1') {
    return RARITY_PROBABILITIES['week1']['byRank'][rankRow]
  }

  if (slot == 1) {
    return RARITY_PROBABILITIES[`week${week}_slot1`]['byRank'][rankRow]
  }
  return RARITY_PROBABILITIES[`week${week}_slot23`]['byRank'][rankRow]
}

export const RARITY_FALLBACKS = {
  1: [2, 3, 4],
  2: [1, 3, 4], 
  3: [2, 1, 4],
  4: [3, 2, 1]
}
export const LIBRARY_RARITY_FALLBACKS = {
  1: [4, 3, 2],
  2: [4, 3, 1], 
  3: [4, 2, 1],
  4: [3, 2, 1]
}

// array of 8 counts for accepting cards
export function getCardsForDraw(
  day: number, 
  vmode: boolean,
  room46: boolean,
) {
  const free = [3, 3, 3, 3]
  let gem
  if (vmode || room46 || day >= 16 ) { gem = [5, 5, 4, 4]}
  if (day >= 8) { gem = [4, 4, 3, 3] }
  else { gem = [4, 3, 3, 3] }
  return [...free, ...gem]
}

export type Deck = PooledRoom[]
export type DeckList = [Deck, Deck, Deck, Deck, Deck, Deck, Deck, Deck]

// Step of the drafting process where we determine which "deck" has enough
// cards to draw from. 
export function countCards(
  decks: DeckList,
  day: number, 
  vmode: boolean,
  haveRoom46: boolean,
): DeckList {

  // Counting Cards step
  const cardsForDraw = getCardsForDraw(day, vmode, haveRoom46)

  // List of lists of decks we might consider, indexed by rarity x freegem
  // Each entry will contain either a single deck, to draw from,
  // A list of decks, from which one should be chosen randomly,
  // Or an empty array, in which case drawing failed.
  const acceptedDecks: Deck[][] = Array(8).fill([])

  // Marking / accepting decks steps
  for (let idx = 0; idx < 8; idx ++) {
    const rarity = idx % 4 + 1 as Rarity
    const freeGem = Math.floor(idx / 4) as 0 | 1

    // Simpler to iterate all 4 rarities start with this one.
    const withFallbacks = [rarity, ...RARITY_FALLBACKS[rarity]]
    let markedDecks: Deck[] = []

    for (const rarity2 of withFallbacks) {
      const idx2 = (rarity2 - 1) + 4 * freeGem
      const dl2 = decks[idx2].length

      // TODO: is this logic right?
      // Do we choose randomly among "marked" decks if there is a deck
      // passing the first check?
      if (dl2 >= cardsForDraw[idx2]) {
        // Maybe should be
        // = [ decks[idx2] ]
        acceptedDecks[idx] = [...markedDecks, decks[idx2]]
        // Stop iterating fallbacks when we get a deck that passing card-counting
        break
      } else if (dl2 > 0) {
        // As long as it has any cards, "mark" it for inclusion
       markedDecks = [...markedDecks, decks[idx2]]
      }
    }
    
    // If we get here and no deck has been accepted, the draw failed
    // and acceptedDecks[idx] will be empty
  }

  // We can go ahead and calculate the effective probability of each card
  // for each deck. We make no attempt to account for cards which already
  // have a probability of being absent.
  // TODO: do so?
  // TODO: distinguish "p[in pool]" from "p[chosen]"...?
  const effectiveDecks = acceptedDecks.map((decklist) => {
    if (decklist.length == 1) {
      const deck = decklist[0]
      const pRoom = 1 / deck.length
      return deck.map((pr) => ({ ...pr, p: pr.p * pRoom}))
    }
    if (decklist.length > 1) {
      const pDeck = 1 / decklist.length
      return decklist
        .map((deck) => {
          const pRoom = 1 / decklist.length
          return deck.map((pr) => ({ ...pr, p: pr.p * pRoom * pDeck}))}
        )
        .reduce((acc, cur) => ([...acc, ...cur]), [])
    }
    else {
      return []
    }
  }) as DeckList

  return effectiveDecks
}


