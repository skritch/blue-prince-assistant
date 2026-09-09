import type { Direction, RoomColor, GridTile, TileRow, Rarity } from './types'

import rawRarityProbabilities from './data/rarityProbabilities.json'
import type { DraftPool } from './pool'
import { binomialAtLeast, KeyedVec } from './math'
import type { DayState } from './day'
import { applyFilters } from './filters'
import type { GameState } from './game'
import type { HouseState } from './house'
import type { PrismColor } from './prism'



export interface HouseDraftParams {
  kind: 'house'
  toLocation: {
    tile: GridTile,
    toDirection: Direction,
  }

  fromRoomSlug?: string
  gems?: number

  previousDraft?: [string, string, string]
  isFirstDraftAtDoor: boolean

  keyUsed?: 'silver' | 'prism' | 'berry picker'
  secretPassageColor?: PrismColor
}

export interface OuterDraftParams {
  kind: 'outer'
  outerRoomDraftCount: number  // 0 = first outer draft this game (forces root-cellar/toolshed/hovel)
  previouslyDraftedOuter?: string  // slug of last outer room drafted; moved to 4th position
  berryPicker: boolean
}

export type DraftParams = HouseDraftParams | OuterDraftParams


export type Deck = KeyedVec<string>
export type DeckList = [Deck, Deck, Deck, Deck, Deck, Deck, Deck, Deck]

export type DraftResult = {
  slots: [KeyedVec, KeyedVec, KeyedVec],
  reasons: [Record<string, string[]>, Record<string, string[]>, Record<string, string[]>]
}

// --- Various helpers ---

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
  } else if (rank >= 5) {
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
  vMode: boolean,
  inLibrary: boolean
): number {
  let pGems: [number, number, number]
  if (inLibrary) {
    pGems = [0, gems == 0 ? 0 : 1, 1]
  } else if (
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

const RARITY_PROBABILITIES = rawRarityProbabilities as unknown as
  Record<string, { byRank: [number, number, number, number][] }> & { library: [number, number, number, number] }

function getRarityProbabilities(
  day: number,
  slot: 1 | 2 | 3,
  rank: TileRow,
  solarium: boolean,
  inLibrary: boolean
) {
  if (inLibrary) {
    return RARITY_PROBABILITIES['library']
  }
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
  return RARITY_PROBABILITIES[`week${week}_slots23`]['byRank'][rankRow]
}

export function getPDeck(
  slot: 1 | 2 | 3,
  day: number, gems: number,
  row: TileRow, placedRooms: number,
  vmode: boolean,
  solarium: boolean, inLibrary: boolean,
  anyDraw: boolean
): KeyedVec<number> {
  let pDecks = KeyedVec.empty<number>()
  let pGem: number
  const pRarities = getRarityProbabilities(day, slot, row, solarium, inLibrary)
  // If anyDraw, we only assign probabilities to free slots
  // TODO: is this right? We use free probabilities to choose a rarity?
  if (anyDraw) {
    pGem = 0
  } else {
    pGem = getPGemBySlot(gems, slot, placedRooms, row, day, vmode, inLibrary)
  }
  for (const [rarityIdx, pRarity] of pRarities.entries()) {
    pDecks = pDecks.set(rarityIdx, pRarity * (1 - pGem))
    pDecks = pDecks.set(rarityIdx + 4, pRarity * pGem)
  }
  return pDecks
}

export function getDeckMinimums(
  day: number,
  vmode: boolean,
  room46: boolean,
): KeyedVec<number> {
  const free = [3, 3, 3, 3]
  let gem
  if (vmode || room46 || day >= 16) { gem = [5, 5, 4, 4] }
  else if (day >= 8) { gem = [4, 4, 3, 3] }
  else { gem = [4, 3, 3, 3] }
  const mins = [...free, ...gem]
  let minsVec = KeyedVec.empty<number>()

  for (let i = 0; i < 8; i++) {
    minsVec = minsVec.set(i, mins[i])
  }
  return minsVec
}

const RARITY_FALLBACKS = {
  1: [1, 2, 3, 4],
  2: [2, 1, 3, 4],
  3: [3, 2, 1, 4],
  4: [4, 3, 2, 1]
}
const LIBRARY_RARITY_FALLBACKS = {
  1: [1, 4, 3, 2],
  2: [2, 4, 3, 1],
  3: [3, 4, 2, 1],
  4: [4, 3, 2, 1]
}


// --- Drafting Steps ---

// Divide the draft pool into 8 decks based on rarity.
// Blocked rooms are ignored.
export function initDecks(
  pool: DraftPool
): DeckList {
  const decks = Array(8).fill(KeyedVec.empty()) as DeckList
  for (const pr of pool.rooms) {
    if (pool.blocks[pr.room.slug]) {
      continue
    }

    const rarity: Rarity = pool.rarityOverrides[pr.room.slug] || pr.room.baseRarity
    const freeGem = pr.room.baseGemCost > 0 ? 1 : 0
    const deckIdx = (rarity - 1) + 4 * freeGem
    decks[deckIdx] = decks[deckIdx].set(pr.room.slug, pr.p)
  }
  return decks
}



// Step of the drafting process where we determine which "decks" have enough
// cards to draw from. Based on 
// https://www.reddit.com/r/BluePrince/comments/1lu20ky/drafting_mechanics_drawing_from_the_room_decks/
// but that source is confusingly-written and may be mistaken.
// 
// The draft process rolls an initial deck i, then checks it along with
// a series of fallback rarities, until it finds a deck for which
//   deck.length >= n
// to draw from, where n = deckMinimums[i]. 
// All non-empty decks are also "marked". When deck is accepted, the source
// indicates that a random marked deck is be chosen to draw from. If no
// deck is accepted, the source states that drafting fails. 
// Later, however, it indicates that that draws 1 and 3 can proceed if
// no deck as accepted, so long as some decks are marked, while only draw 2
// has to "select" a deck (but doesn't use cond. filters, so is likely to.)
// The 2nd version is the only way to get the expected behavior of e.g.
// color filters, so I'm going with that. But I will not attempt to distinguish
// draw 2 from 1 here, expecting that draw 2 is likely to always accept a deck.
// Draw 3 is currently not implemented.
//
// One complexity: cards only have a probability of being in the decks, so the decks
// themselves only have a probability of meeting the >= n or >= 1 criteria. 
// We approximate this by returning a matrix like:
//   Pr[deck j is drawn from | deck i rolled]
// = Pr[deck j accepted & no deck j'<j accepted | deck i rolled]
//   + Pr[deck j marked & none accepted | deck i rolled] * Pr[deck j selected | marked]
//
// We also return pRedrawI, which will trigger a redraw:
//   Pr[no deck is accepted | deck i rolled]
// or, if allowMarked is true,
//   Pr[no deck is marked | deck i rolled]

export function selectDecks(
  decks: DeckList,
  deckMinimums: KeyedVec<number>,  // indexed by i
  inLibrary: boolean = false,
  allowMarked: boolean = true,
): { pDeckIJ: KeyedVec<number>[], pRedrawI: KeyedVec<number> } {

  // Pr[deck j is chosen | deck i was rolled originally]
  const pDeckIJ: KeyedVec<number>[] = Array(8).fill(KeyedVec.empty<number>()) // outer index i
  let pRedrawI = KeyedVec.empty<number>() // keyed by i

  for (let i = 0; i < 8; i++) {
    const rarity = i % 4 + 1 as Rarity
    const freeGem = Math.floor(i / 4) as 0 | 1
    const fallbackOrder = inLibrary ? LIBRARY_RARITY_FALLBACKS[rarity] : RARITY_FALLBACKS[rarity]

    // both keyed by j
    let pMarked = KeyedVec.empty<number>()
    let pAccepted = KeyedVec.empty<number>()

    for (const rarity2 of fallbackOrder) {
      const j = (rarity2 - 1) + 4 * freeGem
      const d2 = decks[j]
      if (d2.length == 0) {
        continue
      }

      // Should this by i or j? Does it depend on the rarity of the deck we are currently
      // checking (j), or the rarity we rolled originally (i)?
      const n = deckMinimums.get(j)

      // Pr(has enough cards) ~= Pr(n or more of L q-coins come up heads)
      //                      ~= 1 - BinomialCDF(n; L, q)
      // where q is the average p of each card being in the deck.
      const q = d2.mean()
      const pAcceptedJ = binomialAtLeast(d2.length, q, n)
      const pMarkedJ = binomialAtLeast(d2.length, q, 1)

      // Pr(j is first deck accepted) 
      // = Pr(no decks before j in fallback order accepted) * Pr(j accepted)
      const pNoneAcceptedSoFar = pAccepted.values().reduce((acc, cur) => acc * (1 - cur), 1)
      const pFirstAccepted = pAcceptedJ * pNoneAcceptedSoFar

      // Add j to outcome for i, weighted by pAcceptedJ
      pDeckIJ[i] = pDeckIJ[i].set(j, pDeckIJ[i].get(j) + pFirstAccepted)

      pAccepted = pAccepted.set(j, pAcceptedJ)
      pMarked = pMarked.set(j, pMarkedJ)
    }

    const pNoneAcceptedI = pAccepted.values().reduce((acc, cur) => acc * (1 - cur), 1)
    const pNoneMarkedI = pMarked.values().reduce((acc, cur) => acc * (1 - cur), 1)

    // On draw 2, we don't consider marked decks at all
    if (!allowMarked) {
      pRedrawI = pRedrawI.set(i, pNoneAcceptedI)
      continue
    }

    pRedrawI = pRedrawI.set(i, pNoneMarkedI)

    // If it's certain a deck will be accepted, or that none will be marked
    // no need to continue
    if (pNoneAcceptedI == 0 || pNoneMarkedI == 1) {
      continue
    }

    // On draws other than draw 2, if no decks are accepted, 
    // one marked decks will be chosen at random.
    // What is Pr(j marked | none accepted)?
    // = Pr(j marked & none accepted) / P(none accepted)
    // = [ Pr(j marked & j not accepted) * P(all j' != j not accepted) / P(none accepted)
    // = (Pr(0 < |j| <= n) / Pr(j not accepted) 
    // = (Pr(j marked) - Pr(j accepted)) / (1 - Pr(j accepted))
    const pMarkedGivenNoneAccepted = (pMarked
      .add(pAccepted.scale(-1)))
      .mult(pAccepted.map((p => 1 / (1 - p))))


    for (const j of pMarked.keys()) {
      // This is the probability this deck is marked
      const pj = pMarkedGivenNoneAccepted.get(j)
      const pks = pMarkedGivenNoneAccepted.unset(j)

      // Need to weight by 1/(number of decks marked) in expectation, i.e.
      // E( 1 / |marked decks| | j was marked)
      // E( 1 / (1 + |marked decks k != j |)
      //  = 1 * Pr(0 marked) 1/2 * Pr(1 marked) + 1/3 * Pr(2 marked) + 1/4 * Pr(3 marked)
      //  = 1 - 1/2 * (sum of p_k) + (1/3) (sum p_k p_k', k > k') - (1/4) (product of p_k)

      const e1 = pks.sum()
      // pairwise sum = [(sum p_j)^2 - sum(p_j^2)] / 2
      const e2 = (e1 * e1 - pks.map(pk => pk * pk).sum()) / 2
      const e3 = pks.values().reduce((acc, pk) => pk != 0 ? acc * pk : acc, 1)
      const pDrawJ = 1 - e1 / 2 + e2 / 3 - e3 / 4
      const markWeight = pNoneAcceptedI * pj * pDrawJ
      pDeckIJ[i] = pDeckIJ[i].set(j, pDeckIJ[i].get(j) + markWeight)
    }

  }

  return { pDeckIJ, pRedrawI }
}


// Copy of the previous function adapted for "Any Draw"
function selectDecksAnyDraw(
  decks: DeckList,
  deckMinimums: KeyedVec<number>,  // indexed by i
  inLibrary: boolean = false
): { pDeckIJ: KeyedVec<number>[], pRedrawI: KeyedVec<number> } {

  const pDeckIJ: KeyedVec<number>[] = Array(8).fill(KeyedVec.empty<number>())
  let pRedrawI = KeyedVec.empty<number>() // keyed by i

  // Note we only iterate to 4, over the free decks.
  for (let i = 0; i < 4; i++) {
    const rarity = i % 4 + 1 as Rarity
    const fallbackOrder = inLibrary ? LIBRARY_RARITY_FALLBACKS[rarity] : RARITY_FALLBACKS[rarity]
    let pMarked = KeyedVec.empty<number>()
    let pAccepted = KeyedVec.empty<number>()

    for (const rarity2 of fallbackOrder) {
      const j = rarity2 - 1

      // Merge free + gem decks for card counting
      const dMerged = decks[j].add(decks[j + 4])
      if (dMerged.length == 0) {
        continue
      }
      const n = deckMinimums.get(j)
      const q = dMerged.mean()
      const pAcceptedJ = binomialAtLeast(dMerged.length, q, n)
      const pMarkedJ = binomialAtLeast(dMerged.length, q, 1)
      const pNoneAcceptedSoFar = pAccepted.values().reduce((acc, cur) => acc * (1 - cur), 1)
      const pFirstAccepted = pAcceptedJ * pNoneAcceptedSoFar

      // Accept the free or gem deck in proportion to their lengths
      // The spec does not describe this clearly, it might be wrong.
      const pFree = decks[j].length / dMerged.length
      pDeckIJ[i] = pDeckIJ[i].set(j, pDeckIJ[i].get(j) + pFirstAccepted * pFree)
      pDeckIJ[i] = pDeckIJ[i].set(j + 4, pDeckIJ[i].get(j + 4) + pFirstAccepted * (1 - pFree))
      pAccepted = pAccepted.set(j, pAcceptedJ)

      // Also mark in proportion to lengths
      pMarked = pMarked.set(j, pMarkedJ * pFree)
      pMarked = pMarked.set(j + 4, pMarkedJ * (1 - pFree))
    }

    const pNoneAcceptedI = pAccepted.values().reduce((acc, cur) => acc * (1 - cur), 1)
    const pNoneMarkedI = pMarked.values().reduce((acc, cur) => acc * (1 - cur), 1)
    pRedrawI = pRedrawI.set(i, pNoneMarkedI)

    if (pNoneAcceptedI == 0 || pNoneMarkedI == 1) {
      continue
    }

    const pMarkedGivenNoneAccepted = (pMarked
      .add(pAccepted.scale(-1)))
      .mult(pAccepted.map((p => 1 / (1 - p))))


    for (const j of pMarked.keys()) {
      const pj = pMarkedGivenNoneAccepted.get(j)
      const pks = pMarkedGivenNoneAccepted.unset(j)
      const e1 = pks.sum()
      const e2 = (e1 * e1 - pks.map(pk => pk * pk).sum()) / 2
      const e3 = pks.values().reduce((acc, pk) => pk != 0 ? acc * pk : acc, 1)
      const pDrawJ = 1 - e1 / 2 + e2 / 3 - e3 / 4
      const markWeight = pNoneAcceptedI * pj * pDrawJ
      pDeckIJ[i] = pDeckIJ[i].set(j, pDeckIJ[i].get(j) + markWeight)
    }

  }

  return { pDeckIJ, pRedrawI }
}

// Given the list of decks, and Pr[deck j chosen | deck i rolled],
// produce, for each original roll i, the "effective" deck:
//   Pr(room r | deck i rolled)
//   = Pr(room r | deck j) * Pr(deck j | deck i rolled)
function mergeMarkedDecks(
  decks: DeckList,
  pDeckIJ: KeyedVec<number>[] // outer index i, inner j
): DeckList {

  let mergedDecks: DeckList = Array(8).fill(KeyedVec.empty()) as DeckList

  for (let i = 0; i < 8; i++) {
    pDeckIJ[i].entries().forEach(([j, pij]) => {
      const deckJ = decks[j]
      // So far the probabilities in a deck are "probability of card being in the deck"
      // Now we're finding the probability of a card being drawn. Each card present is equal.
      // Weighting all by 1 / (sum of probabilities of each card being there) is close enough.
      //
      // TODO: there is a (minor?) bug here. We originally determined with a deck was 
      // accepted or marked with some probability based on the ps of its entries.
      // e.g. a deck with 3 p=0.3 entries is accepted 0.3^3 = 0.027 of the time.
      // When we come to draw from that deck, we don't need to account for the 0.3s
      // of each entry—if we got here, they have to be present.
      // As long as all entries have == p, there's no problem, bc 1/total
      // normalization will cancel out, but if they're uneven the weights are wrong.
      const deckJdraws = deckJ.scale(1. / deckJ.sum())  // Pr(room r | deck j) 

      const deckJweighted = deckJdraws.scale(pij)  // Pr(room r | deck j) * Pr(deck j | deck i rolled)

      // Add probability mass to deck i, we'll find Pr(deck i rolled) later
      mergedDecks[i] = mergedDecks[i].add(deckJweighted)
    })
  }

  return mergedDecks
}



// Simulate a draft in the house, based on:
// https://www.reddit.com/r/BluePrince/comments/1lu20ky/drafting_mechanics_drawing_from_the_room_decks/
//
// Rather than "simulating", we attempt to follow the flow of probability weight
// through the whole deck. Our procedure is:
// 
// Apply filters to the whole pool. Divide into 8 decks.
// For each slot:
// - find probability of each deck being chosen (rarity x free | gem).
// - simulate the whole deck-choice-with-fallback procedure:
//   - select the first deck with enough cards, checking rarities in fallback order.
//     p(room) = p(deck i rolled) * p(deck j selected | i rolled) * 1/(cards in deck j) 
//   - if no decks have enough cards, but some decks have at least one ("marked"),
//     draw from  one at random.
//     p(room) = p(deck i rolled) * p(deck j marked | i rolled & none selected) 
//       * p(j selected from marked decks | non selected) * 1/(cards in deck j) 
//   - else fallback to draw 2, without cond. filters, adding the full pool for this slot
//     scaled by p(no decks selected & no decks marked) 
// - for each room in the overall pool, sum across all i, weighted by p(deck i rolled)
// - ignore validation, "discarding", and draw 3
//
// Returns:
// - an array of 3 vectors of probabilities of rooms for each each slot.
// - an array of 3 optional "reason" annotations explaining probabilities 
export function draftHouse(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
  draw: 1 | 2 | 3 | 'any'
): DraftResult {
  const inLibrary = draft.fromRoomSlug == 'library'

  // Do "any" draws apply conditional filters? Assuming no.
  const filteredPool = applyFilters(pool, game, day, house, draft, draw == 1 || draw == 3)
  const decks = initDecks(filteredPool)
  const deckMinimums = getDeckMinimums(day.day, game.vmode, game.haveRoom46)


  const { pDeckIJ, pRedrawI } = draw == 'any'
    ? selectDecksAnyDraw(decks, deckMinimums, inLibrary)
    : selectDecks(decks, deckMinimums, inLibrary, draw != 2)

  const effectiveDecks = mergeMarkedDecks(decks, pDeckIJ)

  const rank = draft.toLocation.tile.row
  const slots: (1 | 2 | 3)[] = [1, 2, 3]

  // Prepare redraw pool in advance, since all slots use it
  let redrawPools = [KeyedVec.empty(), KeyedVec.empty(), KeyedVec.empty()]
  if (draw == 1 || draw == 2) {
    const redraw = draftHouse(pool, game, day, house, draft, draw + 1 as 2 | 3)
    redrawPools = redraw.slots
  }

  // Build the pool for each slot
  let slotPools = slots.map((slot) => {
    let sp = KeyedVec.empty()

    const pDeckRoll = getPDeck(
      slot, day.day,
      draft.gems || 0, rank, house.placedRooms.length - 2,
      game.vmode, house.solariumInHouse, inLibrary,
      draw == 'any'
    )

    // Cumulative probability of a second draw for this slot
    let pRedraw = 0

    for (const [i, deck] of effectiveDecks.entries()) {
      sp = sp.add(deck.scale(pDeckRoll.get(i)))
      pRedraw = pRedraw + pDeckRoll.get(i) * pRedrawI.get(i)
    }

    if (pRedraw > 0) {
      // Add redraw results to probability mass
      sp = sp.add(redrawPools[slot - 1].scale(pRedraw))
    }


    return sp
  }) as [KeyedVec, KeyedVec, KeyedVec]


  return { slots: slotPools, reasons: [{}, {}, {}] }
}

