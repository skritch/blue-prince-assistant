
import type { DayState } from "./day"
import type { DraftResult, HouseDraftParams } from "./draft"
import type { GameState } from "./game"
import type { HouseState } from "./house"
import { KeyedVec } from "./math"
import type { DraftPool } from "./pool"
import { POWERED_ROOMS, POWER_CONNECTOR_ROOMS } from "./rooms"


function overrideFirstDraft(
): DraftResult {
  const firstDraft = ['bedroom', 'closet', 'hallway']
  const slots = firstDraft.map(s => KeyedVec.empty().set(s, 1))
  const reasons = firstDraft.map(s => ({ [s]: ['guaranteed on first draft'] }))
  return { slots: slots, reasons } as DraftResult
}

function applyWeightedRooms(
  draftResult: DraftResult,
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
): DraftResult & { pWeighted: number } {
  let slots = draftResult.slots
  let reasons = draftResult.reasons

  // No conditions for locations in house because this is already determined
  // by the room being in the pool
  const weightedRooms = [
    {
      slug: 'conservatory',
      p: 0.15,
    },
    {
      slug: 'garage',
      p: 0.9,
      condition: (day.day >= 3 || game.vmode) && !game.haveWestGate && !day.garageSeen
      // Also can't have been offered today, but we don't track that
    },
    {
      slug: 'garage',
      p: 0.925,
      condition: (day.day >= 3 || game.vmode) && game.haveWestGate && !day.garageSeen
    },
    {
      slug: 'morning-room',
      p: 0.7,
      // Must be east/west pierce, but also must be on a wings, so this is sufficient
      // Not treated as a weighted room when drafting advance/retreat
      condition: ['W', 'E'].includes(draft.toLocation.toDirection)
    },
    {
      slug: 'utility-closet',
      p: 0.7,
      condition: (day.day >= 2) && house.placedRooms.includes('garage')
        && !game.haveWestGate && !day.utilityClosetSeen
      // Floor plans in 1/2 shouldn't be dead ends
      // Fan't have been offered as a weighted room yet today
    },
  ]

  // Precheck for presence of all the rooms we might add in this function
  const wrSlugs = weightedRooms.map((wr) => wr.slug)
  const roomsInPool: string[] = pool.rooms.reduce(
    (acc, pr) => wrSlugs.includes(pr.room.slug) ? [...acc, pr.room.slug] : acc,
    Array<string>()
  )

  // Add weighted rooms, always in slot 3, only on the first draft at a door.
  // TODO: if a candidate weighted room has already been drawn in slot 1-2, it won't appear
  // in slot 3, this should lower its probability a bit.
  let pWeighted = 0 // Store the weighted-room probability for later

  for (let i = 0; i < weightedRooms.length; i++) {
    const wr = weightedRooms[i]
    if (
      draft.isFirstDraftAtDoor
      && (wr.condition === undefined || wr.condition)
      && roomsInPool.includes(wr.slug)
      && !house.placedRooms.includes(wr.slug)
    ) {
      const wrOnly = KeyedVec.empty().set(wr.slug, wr.p)
      slots[2] = slots[2]
        .scale(1 - wr.p)
        .add(wrOnly)

      reasons[2][wr.slug] = [
        ...(reasons[2][wr.slug] || []),
        `weighted room +${Math.round(100 * wr.p)}%`
      ]
      pWeighted = wr.p
      break
    }
  }


  return {
    slots,
    reasons,
    pWeighted
  }
}

function applyForcedDraws(
  draftResult: DraftResult,
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
): DraftResult {
  let slots = draftResult.slots
  let reasons = draftResult.reasons

  if (draft.fromRoomSlug == 'tunnel') {
    slots[0] = KeyedVec.empty().set('tunnel', 1)
    reasons[0]['tunnel'] = ["forced tunnel from tunnel"]
  }
  if (draft.fromRoomSlug == 'nook'
    && game.upgrades['nook'] == 'reading-nook'
  ) {
    // tiny adjustment to not draw library if one of the first two slots has it
    const libraryInPool = pool.rooms.reduce(
      (acc, pr) => (pr.room.slug == 'library') || acc, false
    )
    if (libraryInPool) {
      const pLib12 = slots[0].get('library') + slots[1].get('library')
      slots[2] = slots[2].scale(pLib12).add(
        KeyedVec.empty().set('library', 3).scale(1 - pLib12)
      )
      reasons[2]['library'] = ["forced library from reading nook"]
    }
  }

  if (
    draft.fromRoomSlug == 'library'
    && !house.placedRooms.includes('bookshop')
    && draft.gems || 0 >= 1
  ) {
    let pBookshop: number
    if ((game.vmode || game.haveRoom46) && day.haveHallPass) {
      pBookshop = 0.96
    } else if (game.booksPurchased <= 1) {
      // Ignoring the 0.5 on first 0-1 visits, since we're not tracking that
      pBookshop = 0.6
    } else if (game.booksPurchased <= 4) {
      pBookshop = 0.5
    } else {
      pBookshop = 0.1
    }
    slots[2] = slots[2]
      .scale(1 - pBookshop)
      .add(KeyedVec.empty().set('bookshop', pBookshop))

    reasons[2]['bookshop'] = [`library +${Math.round(100 * pBookshop)}%`]
  }


  // mt holly gift shop after room 46? probably can't.

  return {
    slots,
    reasons
  }
}


function applyDuctDrafting(
  draftResult: DraftResult,
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
  pWeighted: number
): DraftResult {
  let slots = draftResult.slots
  let reasons = draftResult.reasons

  // Duct Drafting
  // Ignoring electric eel aquarium
  // Ignoring complicated exit-list stuff at North-Pierce exits
  // We also don't think about later slots not drawing dupes of 
  // earlier slots.
  if (draft.fromRoomSlug
    && (POWERED_ROOMS.has(draft.fromRoomSlug)
      || POWER_CONNECTOR_ROOMS.has(draft.fromRoomSlug))) {

    const pDuct1 = day.boilerActivated ? 0.7 : 0.25
    const pDuct23 = 0.3

    // Is this right? Slots checked left to right, with pDuct1 used
    // if no duct draws selected yet?
    const pDuctSlots = [
      // Slot 1
      pDuct1,
      // Slot 2
      (1 - pDuct1) * pDuct1 + pDuct1 * pDuct23,
      // Slot 3:
      ((1 - pDuct1) * (1 - pDuct1) * pDuct1  // neither of 1/2
        + pDuct1 * (1 - pDuct23) * pDuct23 // 1 
        + (1 - pDuct1) * pDuct1 * pDuct23 // 2
        + pDuct1 * pDuct23 * pDuct23) // both
      * (1 - pWeighted) // scale down slot 3 by p of a weighted-room draw
    ]
    const fromConnector = POWER_CONNECTOR_ROOMS.has(draft.fromRoomSlug)

    for (let s = 0; s <= 2; s++) {
      let ductPool = new KeyedVec()
      for (const [slug, p] of slots[s].entries()) {
        if (
          // reject duct rooms with zero probability to keep
          // gem rooms from appearing in slot 1 and the like
          p > 0
          && (
            POWER_CONNECTOR_ROOMS.has(slug)
            || (fromConnector && POWERED_ROOMS.has(slug))
          )
        ) {
          ductPool = ductPool.set(slug, 1)
        }
      }
      if (ductPool.length == 0) {
        continue
      }
      const pEachDuct = pDuctSlots[s] / ductPool.length
      ductPool = ductPool.scale(pEachDuct)
      slots[s] = slots[s]
        .scale(1 - pDuctSlots[s])
        .add(ductPool)

      for (const slug of ductPool.keys()) {
        reasons[s][slug] = [
          ...(reasons[s][slug] || []),
          `duct draft +${Math.round(pEachDuct * 100)}%`
        ]
      }
    }
  }

  return {
    slots,
    reasons
  }
}

// Weighted Rooms, Duct Drafting, & misc.
// https://www.reddit.com/r/BluePrince/comments/1lzdvv9/drafting_mechanics_weighted_rooms_the_library_and/
//
// We mostly don't attempt to reconcile conflicts between these mechanics.
export function applyDraftOverrides(
  draftResult: DraftResult,
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
): DraftResult {


  // Override very first draft
  if (day.day == 1 && house.placedRooms.length == 2) {
    return overrideFirstDraft()
  }

  const weightedResult = applyWeightedRooms(draftResult, pool, game, day, house, draft)
  const pWeighted = weightedResult.pWeighted
  draftResult = applyForcedDraws(weightedResult, pool, game, day, house, draft)
  draftResult = applyDuctDrafting(draftResult, pool, game, day, house, draft, pWeighted)

  return draftResult
}
