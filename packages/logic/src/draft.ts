import type { Direction, RoomColor, GridTile, TileRow, Rarity } from './types'

import rawRarityProbabilities from './data/rarityProbabilities.json'
import type { DraftPool, PooledRoom } from './pool'
import { binomialAtLeast, KeyedVec } from './math'
import { applyConditionalFilters, applyRunbackFilter, getConditionalFilters, type FilterResult } from './filters'
import type { DayState } from './day'
import type { GameState } from './game'
import type { HouseState } from './house'
import { partition } from './utils'
import { OUTER_ROOMS } from './rooms'


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

export interface OuterDraftParams {
  kind: 'outer'
  outerRoomDraftCount: number  // 0 = first outer draft this game (forces root-cellar/toolshed/hovel)
  previouslyDraftedOuter?: string  // slug of last outer room drafted; moved to 4th position
}

export type DraftParams = HouseDraftParams | OuterDraftParams


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
  return RARITY_PROBABILITIES[`week${week}_slots23`]['byRank'][rankRow]
}



export function getPDeck(
  slot: 1 | 2 | 3,
  day: number, gems: number,
  row: TileRow, placedRooms: number,
  vmode: boolean, solarium: boolean
): KeyedVec<number> {
  let pDecks = KeyedVec.empty<number>()
  const pRarities = getRarityProbabilities(day, slot, row, solarium)
  const pGem = getPGemBySlot(gems, slot, placedRooms, row, day, vmode)
  for (const [rarityIdx, pRarity] of pRarities.entries()) {
    pDecks = pDecks.set(rarityIdx, pRarity * (1 - pGem))
    pDecks = pDecks.set(rarityIdx + 4, pRarity * pGem)
  }
  return pDecks
}

// array of 8 counts for accepting cards
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

export type Deck = KeyedVec<string>
export type DeckList = [Deck, Deck, Deck, Deck, Deck, Deck, Deck, Deck]


// Drafting Steps
export function applyFilters(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft?: DraftParams,
  useConditionalFilters: boolean = true
): DraftPool {

  // Outer draft uses position-override mechanics instead of conditional filters
  if (!draft || 'kind' in draft) {
    return pool
  }

  const condFilters = getConditionalFilters(game, day, house)

  // first apply non-conditional filters
  let filteredPool = pool.rooms.map((pr) => {
    const filterResults: FilterResult[] = []

    // Discard Filter -> ignore

    // Runback Filter
    // TODO: secret passage does not affect runback, but prism does.
    // Outer rooms do not involve runback, prior draft is used.
    // Berry picker, secret garden, room 8 make a secret draw and apply it to runback
    if (draft.previousDraft !== undefined) {
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
    }), { p: 1, failReason: undefined })

    return [pr, finalResult]
  }) as [PooledRoom, FilterResult][]

  const [keptRooms, removedRooms] = partition(
    filteredPool, ([, fr]) => (!fr.failReason)
  )

  return {
    ...pool,
    rooms: keptRooms.map(([pr, fr]) => ({ ...pr, p: fr.p })),
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
  const decks = Array(8).fill(KeyedVec.empty()) as DeckList
  for (const pr of pool.rooms) {
    const rarity: Rarity = pool.rarityOverrides[pr.room.slug] || pr.room.baseRarity
    const freeGem = pr.room.baseGemCost > 0 ? 1 : 0
    const deckIdx = (rarity - 1) + 4 * freeGem
    decks[deckIdx] = decks[deckIdx].set(pr.room.slug, pr.p)
  }
  return decks
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
// One complexity: cards only a probability of being in the decks, so the decks
// themselves only have a probability of meeting the >= n or >= 1 criteria. 
// We aim to simulate this procedure, returning for each deck i a vector:
//   Pr[deck j is drawn from | deck i rolled]
// = Pr[deck j accepted & no deck j'<j accepted | deck i rolled]
//   + Pr[deck j marked & none accepted | deck i rolled] * Pr[deck j selected | marked]
//
// We also return pNoneMarked, which triggers a redraw, i.e.:
//  Pr[no deck is marked | deck i rolled]

export function selectDecks(
  decks: DeckList,
  deckMinimums: KeyedVec<number>  // indexed by i
): { pDeckIJ: KeyedVec<number>[], pNoneMarked: KeyedVec<number> } {

  // Pr[deck j is chosen | deck i was rolled originally]
  const pDeckIJ: KeyedVec<number>[] = Array(8).fill(KeyedVec.empty<number>()) // outer index i
  let pNoneMarked = KeyedVec.empty<number>() // keyed by i

  for (let i = 0; i < 8; i++) {
    const rarity = i % 4 + 1 as Rarity
    const freeGem = Math.floor(i / 4) as 0 | 1
    const fallbackOrder = RARITY_FALLBACKS[rarity]

    // both keyed by j
    let pMarked = KeyedVec.empty<number>()
    let pAccepted = KeyedVec.empty<number>()

    for (const rarity2 of fallbackOrder) {
      const j = (rarity2 - 1) + 4 * freeGem
      const d2 = decks[j]
      if (d2.length == 0) {
        continue
      }
      const n = deckMinimums.get(j)  // or i? Does it depend on the rarity we rolled originally?

      // Pr(has enough cards) ~= Pr(n or more of L q-coins come up heads)
      //                      ~= 1 - BinomialCDF(n; L, q)
      // where q is the average p each card being in the deck.
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
    pNoneMarked = pNoneMarked.set(i, pNoneMarkedI)

    if (pNoneAcceptedI == 0 || pNoneMarkedI == 1) {
      continue
    }

    // If none are accepted, one marked decks should be chosen at random.
    // What is Pr(j marked | none accepted)?
    // = Pr(j marked & none accepted) / P(none accepted)
    // = [ Pr(j marked & j not accepted) * P(all j' != j not accepted) / P(none accepted)
    // = (Pr(0 < |j| <= n) / Pr(j not accepted) 
    // = (Pr(j marked) - Pr(j accepted)) / (1 - Pr(j accepted))
    const pMarkedGivenNoneAccepted = (pMarked
      .add(pAccepted.scale(-1)))
      .mult(pAccepted.map((p => 1 / (1 - p)))
      )


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

  return { pDeckIJ, pNoneMarked }
}

// Given the list of decks, and Pr[deck j chosen | deck i rolled],
// produce, for each original roll i, the "effective" deck:
//   Pr(room r | deck i rolled)
//   = Pr(room r | deck j) * Pr(deck j | deck i rolled)
export function mergeMarkedDecks(
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



// Blue filter (Blueprint): 50/50 A/B split, each with a 50% secondary room insertion.
// Results in 4 equally-likely ordered triples for slots 1-3:
//   A0 (25%): toolshed, shelter, shrine
//   A1 (25%): schoolhouse, toolshed, shelter   (schoolhouse inserts at 1st)
//   B0 (25%): shrine, shelter, schoolhouse
//   B1 (25%): toolshed, shrine, shelter         (toolshed inserts at 1st)
export function draftOuterBlueFilter(): [KeyedVec, KeyedVec, KeyedVec] {
  const roomSet = new Set(OUTER_ROOMS)
  const scenarios: [string, string, string][] = [
    ['toolshed', 'shelter', 'shrine'],
    ['schoolhouse', 'toolshed', 'shelter'],
    ['shrine', 'shelter', 'schoolhouse'],
    ['toolshed', 'shrine', 'shelter'],
  ]

  let slots: [KeyedVec, KeyedVec, KeyedVec] = [
    KeyedVec.empty(), KeyedVec.empty(), KeyedVec.empty()
  ]
  for (const scenario of scenarios) {
    for (let k = 0; k < 3; k++) {
      const room = scenario[k]
      if (roomSet.has(room)) {
        slots[k] = slots[k].set(room, slots[k].get(room) + 0.25)
      }
    }
  }
  return slots
}


// P(room in slot) proportional to (1 - pBack[room]), normalized to sum=1.
// Excluded rooms (already assigned to another slot) are skipped.
export function outerWeightedDist(
  pBack: Record<string, number>,
  excluded: string[]
): KeyedVec {
  const skip = new Set(excluded)
  let totalWeight = 0
  const weights: [string, number][] = []

  for (const room of OUTER_ROOMS) {
    if (skip.has(room)) continue
    const w = 1.0 - (pBack[room] ?? 0)
    if (w > 0) { weights.push([room, w]); totalWeight += w }
  }

  let result = KeyedVec.empty<string>()
  for (const [room, w] of weights) {
    result = result.set(room, totalWeight > 0 ? w / totalWeight : 0)
  }
  return result
}