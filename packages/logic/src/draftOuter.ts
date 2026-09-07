import type { DayState } from "./day"
import type { OuterDraftParams, DraftResult } from "./draft"
import type { GameState } from "./game"
import type { HouseState } from "./house"
import { KeyedVec } from "./math"
import { OUTER_ROOMS } from "./rooms"
import type { RoomColor } from "./types"

// Blue filter (Blueprint): 50/50 A/B split, each with a 50% secondary room insertion.
// Results in 4 equally-likely ordered triples for slots 1-3:
//   A0 (25%): toolshed, shelter, shrine
//   A1 (25%): schoolhouse, toolshed, shelter   (schoolhouse inserts at 1st)
//   B0 (25%): shrine, shelter, schoolhouse
//   B1 (25%): toolshed, shrine, shelter         (toolshed inserts at 1st)
function draftOuterBlueFilter(): [KeyedVec, KeyedVec, KeyedVec] {
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
function outerWeightedDist(
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





// Draft an outer room, based on:
// https://www.reddit.com/r/BluePrince/comments/1liagtk/outer_room_basic_draft_rates_effects_of_rarity/
//
// The 8 outer rooms are shuffled, then specific rooms are biased toward the back
// (positions 6-8, not visible) or front (positions 1-3, visible) based on game state
// and active color filters.
export function draftOuter(
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: OuterDraftParams
): DraftResult {

  const { outerRoomDraftCount, previouslyDraftedOuter } = draft

  let slotPools: DraftResult['slots'] = [KeyedVec.empty(), KeyedVec.empty(), KeyedVec.empty()]
  let reasons: DraftResult['reasons'] = [{}, {}, {}]

  // Day 1 force: first outer draft always shows root-cellar, toolshed, hovel,
  // except in vmode. 
  // Technically vmode only disables the forced first-draft if you draft it 
  // *on* day 1, but it's not worth exposing an option for that.
  if (outerRoomDraftCount === 0 && !game.vmode) {
    const firstDraft = ['root-cellar', 'toolshed', 'hovel']
    for (let i = 1; i <= 3; i++) {
      slotPools[i] = KeyedVec.empty().set(firstDraft[i], 1)
      reasons[i] = { [firstDraft[i]]: ['guaranteed on first draft'] }
    }
    return { slots: slotPools, reasons }
  }

  // Displacement probabilities: how likely each room ends up in positions 6-8 
  // (not visible unless rerolled).
  let pTombBack: number
  let pSchoolhouseBack: number
  let pShrineBack: number

  if (game.haveRoom46 || (game.vmode && day.day == 1)) {
    pTombBack = 0.10; pSchoolhouseBack = 0.10; pShrineBack = 0.10
  } else if (day.day >= 8 || game.vmode || outerRoomDraftCount >= 4) {
    pTombBack = 0.45; pSchoolhouseBack = 0.45; pShrineBack = 0.30
  } else {
    pTombBack = 0.99; pSchoolhouseBack = 0.95; pShrineBack = 0.60
  }

  // Foundation elevator + 3+ outer drafts
  if (game.haveFoundationElevator && outerRoomDraftCount >= 3) {
    pTombBack = 0.1
  }

  const pBack: Record<string, number> = {
    'tomb': pTombBack,
    'schoolhouse': pSchoolhouseBack,
    'shrine': pShrineBack,
  }

  // Previously drafted outer room is displaced to position 4 (not visible)
  // TODO overriden by filters?
  if (previouslyDraftedOuter) {
    pBack[previouslyDraftedOuter] = 1.0
  }

  // Active color filters drive position overrides specific to outer room drafting.
  const activeColors = new Set<RoomColor>()
  if (day.chessColor) activeColors.add(day.chessColor)
  if (day.scepterColor) activeColors.add(day.scepterColor)
  if (house.greenhouseInHouse) activeColors.add('green')
  if (day.draxusActive) activeColors.add('black')

  if (activeColors.has('blue')) {
    let blueResult = draftOuterBlueFilter()
    if (activeColors.has('black')) {
      // black overrides blue slot 1
      blueResult[0] = KeyedVec.empty().set('tomb', 1)
    }
    return { slots: blueResult, reasons }
  }

  // Single-room slot-1 promotions; priority order resolves conflicts
  let promotedToSlot1: string | null = null
  if (activeColors.has('black')) {
    promotedToSlot1 = 'tomb'
  } else if (activeColors.has('gold')) {
    promotedToSlot1 = 'trading-post'
  } else if (activeColors.has('green')) {
    promotedToSlot1 = 'root-cellar'
  } else if (activeColors.has('purple')) {
    promotedToSlot1 = 'hovel'
  }

  if (promotedToSlot1) {
    const slot1 = KeyedVec.empty<string>().set(promotedToSlot1, 1.0)
    // Displacement for the promoted room is overridden by the color filter;
    // remaining rooms compete by weight for slots 2 and 3.
    const rest = outerWeightedDist(pBack, [promotedToSlot1])
    return { slots: [slot1, rest, rest], reasons }
  }

  // No color override: each slot's marginal distribution is the same weighted draw.
  const dist = outerWeightedDist(pBack, [])
  return { slots: [dist, dist, dist], reasons }
}