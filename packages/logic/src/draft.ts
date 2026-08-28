import type { Direction, RoomColor, GridTile, TileRow, Rarity } from './types'

import rawRarityProbabilities from './data/rarityProbabilities.json'
import type { DraftPool, PooledRoom } from './pool'
import { binomialAtLeast, PVec } from './math'
import { applyConditionalFilters, applyRunbackFilter, getConditionalFilters, type FilterResult } from './filters'
import type { DayState } from './day'
import type { GameState } from './game'
import { partition } from './utils'


const RARITY_PROBABILITIES = rawRarityProbabilities as unknown as Record<string, Record<'byRank', [number, number, number, number][]>>

export interface HouseDraftParams {
  toLocation: {
    tile: GridTile,
    toDirection: Direction,
  }

  fromRoomSlug?: string
  gems?: number

  previousDraft?: [string, string, string]
  isFirstDraftAtDoor: boolean
  keyUsed?: 'silver' | 'secret-garden' | 'room-8' | ['prism', RoomColor]
  secretPassageColor?: Exclude<RoomColor, 'black' | 'blue'> | null
  boilerActivated?: boolean


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

function getPGemBySlot(
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
  } else {
    const slot2chance = rareCheckSlot2Chance(gems, rank)
    const slot3chance = rareCheckSlot3Chance(gems, roomsDrafted, rank)

    // If slot 2 gets a rare check, slot 3 automatically does
    // Scale down slot3chance by chance 1 - slot2chance
    pGems = [0, slot2chance, (1 - slot2chance) * slot3chance]
  }
  return pGems[slot - 1]
}

function getRarityProbabilities(
  day: number,
  slot: 1 | 2 | 3,
  rank: TileRow,
  solarium: boolean = false
) {
  // TODO: add library, solarium
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



export function getPDeck(
  slot: 1 | 2 | 3, 
  day: number,  gems: number, 
  row: TileRow, placedRooms: number,
  vmode: boolean
) {
    const pDecks = Array(8).fill(0)
    const pRarities = getRarityProbabilities(day, slot, row, false)
    const pGem = getPGemBySlot(gems, slot,  placedRooms, row, day, vmode)
    for (const [rarityIdx, pRarity] of pRarities.entries()) {
      pDecks[rarityIdx] = pRarity * (1 - pGem)
      pDecks[rarityIdx + 4] = pRarity * pGem
    }
    return pDecks
}

// array of 8 counts for accepting cards
export function getDeckAcceptanceCts(
  day: number,
  vmode: boolean,
  room46: boolean,
) {
  const free = [3, 3, 3, 3]
  let gem
  if (vmode || room46 || day >= 16) { gem = [5, 5, 4, 4] }
  if (day >= 8) { gem = [4, 4, 3, 3] }
  else { gem = [4, 3, 3, 3] }
  return [...free, ...gem]
}

export type Deck = PVec
export type DeckList = [Deck, Deck, Deck, Deck, Deck, Deck, Deck, Deck]


// Drafting Steps
export function applyFilters(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  draft?: DraftParams,
  useConditionalFilters: boolean = true
): DraftPool {

  // TODO: handle outer room differently
  if (draft === 'outer') {
    return pool
  }

  const condFilters = getConditionalFilters(game, day)

  // first apply non-conditional filters
  let filteredPool = pool.rooms.map((pr) => {
    const filterResults: FilterResult[] = []

    // Discard Filter -> ignore

    // Runback Filter
    // TODO: secret passage does not affect runback, but prism does.
    // Outer rooms do not involve runback, prior draft is used.
    // Berry picker, secret garden, room 8 make a secret draw and apply it to runback
    if ((draft !== undefined && draft.previousDraft !== undefined )) {
      const rarity = pool.rarityOverrides[pr.room.slug] || pr.room.baseRarity
      filterResults.push(applyRunbackFilter(
        pr, 
        rarity, 
        draft.previousDraft!, 
        draft.isFirstDraftAtDoor
      ))
    }

    // Double Down Filter -> ignore
    // Library Filter -> TODO. Where's this list?
    // Ignore Filter -> freezer, rumpus, blue crown -> ignore for now

    if (useConditionalFilters) {
      filterResults.push(applyConditionalFilters(pr, condFilters))
    }

    const finalResult = filterResults.reduce((acc, cur) => ({
      p: acc.p * cur.p,
      failReason: acc.failReason || cur.failReason 
    }), {p: 1, failReason: undefined})

    return [pr, finalResult]
  }) as [PooledRoom, FilterResult][]

  const [keptRooms, removedRooms] = partition(
    filteredPool, ([, fr]) => (!fr.failReason)
  )

  return {
    ...pool,
    rooms: keptRooms.map(([pr, fr]) => ({...pr, p:fr.p})),
    removed: [
      ...pool.removed, 
      ...removedRooms.map(([pr, fr]) => ({ ...pr, reason: fr.failReason }))
    ]
  }
}


// Divide the draft pool into 8 decks based on rarity
export function initDecks(
  pool: DraftPool
): DeckList {  
  const decks = Array(8).fill(PVec.empty()) as DeckList
  for (const pr of pool.rooms) {
    const rarity: Rarity = pool.rarityOverrides[pr.room.slug] || pr.room.baseRarity
    const freeGem = pr.room.baseGemCost > 0 ? 1 : 0
    const deckIdx = (rarity - 1) + 4 * freeGem
    decks[deckIdx] = decks[deckIdx].set(pr.room.slug, pr.p)
  }
  return decks
}


const RARITY_FALLBACKS = {
  1: [2, 3, 4],
  2: [1, 3, 4],
  3: [2, 1, 4],
  4: [3, 2, 1]
}
const LIBRARY_RARITY_FALLBACKS = {
  1: [4, 3, 2],
  2: [4, 3, 1],
  3: [4, 2, 1],
  4: [3, 2, 1]
}


// Step of the drafting process where we determine which "decks" have enough
// cards to draw from. We return an array of 8 "effective" decks, which have
// already applied the rarity fallbacks and assigned probabilities to
// each card, along with a probability of each accepted deck having *actually*
// been accepted.
// The draft process will choose an initial deck, then check that deck and
// a series of fallback rarities until it finds a deck >= 
// to draw from. All non-empty decks are also "marked". Once a deck is accepted,
// a random marked deck will be chosen and drawn from.
// (This logic is a bit suspect: why draw from the smaller decks at all?)
// To determine the approximate probability of a deck being chosen,
// we run this fallback procedure, 
export function markDecks(
  decks: DeckList,
  day: number,
  vmode: boolean,
  haveRoom46: boolean,
): { markedDecks: Deck[][], acceptancePs: number[] } {

  const ks = getDeckAcceptanceCts(day, vmode, haveRoom46)

  // For each of the 8 deck, contains a list of the marked decks
  // which could be chosen, ending with the "accepted" deck.
  // If empty, the draw failed.
  const markedDecks: Deck[][] = Array(8).fill([])

  // Most filters only keep cards with some probability. This means we don't 
  // actually know how big our decks "are" in this simulation. 
  // It would be infeasible to simulate every possibility. Instead we estimate
  // the probability of a deck having k cards (where k is the number of cards
  // to be accepted) by
  //   P(has enough cards) = P(k or more of N p-coins come up heads)
  //                       = 1 - BinomialCDF(k-1; N, p)
  // where p is the *average* probability of each card being in the deck.
  // 
  // This will miss all cases where the first big-enough deck we encounter randomly
  // *doesn't* have enough cards to accept, but a later deck would have enough.
  const acceptancePs: number[] = Array(8).fill(0)

  for (let idx = 0; idx < 8; idx++) {
    const rarity = idx % 4 + 1 as Rarity
    const freeGem = Math.floor(idx / 4) as 0 | 1

    // Simpler to iterate all 4 rarities starting with this one.
    const withFallbacks = [rarity, ...RARITY_FALLBACKS[rarity]]
    let marked: Deck[] = []

    for (const rarity2 of withFallbacks) {
      const idx2 = (rarity2 - 1) + 4 * freeGem
      const d2 = decks[idx2]
      const k = ks[idx2]

      // Acceptance
      if (d2.length >= k) {
        markedDecks[idx] = [...marked, d2]

        // Approximate P(has enough cards)
        const avgP = d2.mean()
        const pAccepted = binomialAtLeast(d2.length, avgP, k - 1)
        acceptancePs[idx] = pAccepted

        // Stop iterating fallbacks when we get a deck that passing card-counting
        break
      } else if (d2.length > 0) {
        // As long as it has any cards, "mark" it for inclusion
        marked.push(d2)
      }
    }

    // If we get here and no deck has been accepted, the draw definitely failed
    // markedDecks[idx] will be [] and acceptancePs[idx] will be 0
  }

  return { markedDecks,  acceptancePs}
}

// Merge the marked decks into a single deck by modifying probabilities.
export function joinMarkedDecks(
  markedDecks: Deck[][]
): DeckList {

  // We can go ahead and calculate the effective probability of each card
  // for each deck.
  // TODO: do so?
  // TODO: distinguish "p[in pool]" from "p[chosen]"...?
  return markedDecks.map((decklist) => {
    if (decklist.length == 1) {
      const deck = decklist[0]
      const pRoom = 1 / deck.length
      return deck.mult(pRoom)
    }
    if (decklist.length > 1) {
      // TODO: each marked deck only has a probability of being here...
      // e.g. if a marked deck has 1 entry with a 30% chance of surviving filtering,
      // then it might have been marked at all, and shouldn't contribute to the 1/decks
      // probability.
      // Hard to think about...
      const pDeck = 1 / decklist.length
      return decklist
        .map((deck) => {
          const pRoom = 1 / deck.length
          return deck.mult(pRoom * pDeck)
        }
        )
        .reduce((acc, cur) => acc.add(cur), PVec.empty())
    }
    else {
      return PVec.empty()
    }
  }) as DeckList
}


