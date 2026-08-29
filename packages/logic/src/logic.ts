
import { DEAD_ENDS, MIRROR_ROOMS, OUTER_ROOMS, POOL_ADDITIONS, POWER_CONNECTOR_ROOMS, POWERED_ROOMS, ROOM_46_REWARDS } from './rooms'
import { classifyExitTo, getRoomsAt } from './roomLocations'
import type { DayState } from './day'
import { addToPool, annotateRoom, blockDraft, fromGameState, removeFromPool, type DraftPool, type PooledRoom } from './pool'
import type { HouseState } from './house'
import { type GameState } from './game'
import { getAdHocRarities, getDynamicRarities } from './rarity'

import { applyFilters, draftOuterBlueFilter, getDeckMinimums, getPDeck, initDecks, mergeMarkedDecks, outerWeightedDist, selectDecks, type DraftParams, type HouseDraftParams, type OuterDraftParams } from './draft'
import type { RoomColor } from './types'
import { KeyedVec } from './math'

// Basic algorithm to determine the eligible pool
export function generateDraftPool(
  game: GameState,
  day: DayState,
  house: HouseState,
  draft?: DraftParams
): DraftPool {

  var pool: DraftPool = fromGameState(game)

  pool = getBasePool(pool, game, day, house)
  pool = removeDraftedRooms(pool, house)
  if (draft !== undefined) {
    pool = constrainForLocation(pool, draft)
  }
  pool = applyDraftingBlocks(pool, game, day, draft)
  pool = setDynamicRarities(pool, game, day, house)
  if (draft !== undefined) {
    pool = runDraft(pool, game, day, house, draft)
  }
  return pool
}

// Build the drafting pool, based on game conditions and unlocks
function getBasePool(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState
): DraftPool {
  if (game.haveRoom46) { pool = addToPool(pool, ROOM_46_REWARDS, 'room46') }
  if (game.haveTrophy && !game.haveRoom46) { pool = addToPool(pool, ['trophy-room'], 'trophy') }
  if (house.poolInHouse) { pool = addToPool(pool, POOL_ADDITIONS, 'pool-in-house') }
  if (day.baconAndEggs) { pool = addToPool(pool, ['morning-room'], 'bacon-and-eggs') }
  if (day.knightChess) { pool = addToPool(pool, ['armory'], 'knight-chess') }
  if (day.pawnChessKnight) { pool = addToPool(pool, ['armory'], 'pawn-chess') }
  if (day.aquariumExperimentActivations) {
    // TODO confirm this mechanic
    const ct = 3 * day.aquariumExperimentActivations
    pool = addToPool(pool, Array(ct).fill('aquarium'), 'laboratory')
  }

  // Chamber of Mirrors permanent additions
  // https://www.reddit.com/r/BluePrince/comments/1mkgzuj/chamber_of_mirrors_passive_and_permanent_effects/
  if (game.chamberOfMirrorsAdditions) {
    pool = addToPool(pool, game.chamberOfMirrorsAdditions, 'com-permanent')
  }

  // V-mode additions
  // https://www.reddit.com/r/BluePrinceUncensored/comments/1t4nmpn/v_mode_what_it_is_and_what_day_1_trophy_hunters/
  if (!game.vmode) {
    // TODO is this double-counting from the drafting block?
    // I think yes.
    if (day.day < 3) { pool = annotateRoom(pool, { pct: 5 }, 'master-bedroom', "day 1/2") }
    if (day.day < 5) { pool = annotateRoom(pool, { pct: 20 }, 'library', "day 1/2") }
  }

  // Schoolhouse classrooms
  // https://www.reddit.com/r/BluePrince/comments/1lrxff0/the_mechanics_of_drafting_multiple_classrooms/
  // TODO: fairly complicated, for now we just add 8 schoolhouses
  if (house.schoolhouseInHouse) {
    pool = addToPool(pool, Array(8).fill('classroom'), 'schoolhouse')
  }

  if (game.vmode || game.haveRoom46) {
    pool = annotateRoom(pool, { pct: 100 }, 'bookshop', "must have drafted library 5 times")
  } else {
    pool = annotateRoom(pool, { pct: 100 }, 'bookshop', "must have drafted library 8 times")
  }


  // Chamber of Mirrors duplicates, simplified somewhat.
  // for each room already in the house and in the mirrored list
  //   add an additional copy to the pool.
  // one of the copies will then be removed when we remove the current drafts,
  // https://www.reddit.com/r/BluePrince/comments/1mkgzuj/chamber_of_mirrors_passive_and_permanent_effects/

  if (house.chamberOfMirrorsInHouse) {
    const houseCounts: Record<string, number> = {}
    for (const slug of house.placedRooms) {
      houseCounts[slug] = (houseCounts[slug] ?? 0) + 1
    }
    for (const [slug, ct] of Object.entries(houseCounts)) {
      // TODO: CoM has special classroom interactions. 
      // For now just treat classroom like all the others
      if (MIRROR_ROOMS[slug] || slug == 'classroom') {
        pool = addToPool(pool, [slug], 'com-passive')

        // Annotate
        const mirroredModifier = MIRROR_ROOMS?.[slug]?.["mirrored"]
        if (mirroredModifier == "never") {
          pool = annotateRoom(pool, { "mirrorNote": "will only be mirrored if drafted after CoM" }, slug)
        } else if (mirroredModifier == "modified") {
          pool = annotateRoom(pool, { "mirrorNote": "if drafted after CoM, will modified drafting rules" }, slug)
        }
      }
    }
  }
  return pool
}

// Apply drafting blocks, and annotate probabilistic ones.
// TODO: update "p" instead of attaching annotations
function applyDraftingBlocks(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  draft?: DraftParams
) {

  if (!(game.haveRoom46
    || game.foundEpsenTomb
    || (game.vmode && (2 <= day.day && day.day <= 7))
    || (game.curseOrDare && (1 <= day.day && day.day <= 7))
    || day.day >= 12
  )) {
    pool = blockDraft(pool, 'her-ladyships-chamber', "blocked until Room 46, Epsen tomb, or day 12, but unblocked in v-mode before day 8")
  }

  // What mechanic actually removes study? Is it a block?
  // TODO: I've definitely seen a study day 1, though V-mode should not kick in until day 2.
  if (day.day < 3 && !game.vmode) {
    pool = blockDraft(pool, 'study', "blocked day 1/2, unless in v-mode.")
  }


  if (draft !== undefined && draft.kind == 'house') {
    const loc = draft.toLocation
    const exit = classifyExitTo(loc.tile, loc.toDirection)
    if (exit == 'center' && ['W', 'E'].includes(loc.toDirection)) {
      // Note this block persists until next center N/S draft
      pool = blockDraft(pool, 'tunnel', "blocked when drafting W or E into a center tile until next draft N or S into a center tile")
    }

    if ((loc.tile.column == 'C' && loc.tile.row == 8) || loc.tile.row == 2) {
      // Not sure if "block" is right mechanism here
      pool = blockDraft(pool, 'foundation', "blocked in C8 and row 2")
    } else if (loc.tile.row == 3) {
      // technically removes from exit list? Only applies to center tiles, but Foundation is not eligible for edges anyway
      pool = annotateRoom(pool,
        { blockPct: 90, blockNote: "blocked when drafting into rank 3 center tiles", },
        'foundation')
    }

    if (
      (['east-advance', 'west-advance'].includes(exit) && loc.tile.row == 8)
      || (['east-retreat', 'west-retreat'].includes(exit) && loc.tile.row == 2)
    ) {
      // Unintended behavior here: secret-passage is blocked until 
      // drafting some other advance/retreat on wings.
      const reason = "blocked when drafting north into row 8 or south into row 2 until next E/W edge draft"
      pool = blockDraft(pool, 'secret-passage', reason)
      if (game.upgrades['spare-room'] == 'spare-secret-passage') {
        pool = blockDraft(pool, 'spare-room', reason)
      }
    }

    if (loc.tile.row == 2 && exit == 'east-advance') {
      // greenhouse block persists until another E advance, making W retreat impossible
      pool = blockDraft(pool, 'greenhouse', "blocked when drafting north into E2 until next north draft on east wing")
    }

    // Responsible for garage only appearing at 4+.
    // Ignoring some exit lists subtleties that don't appear to do anything
    if ([2, 3].includes(loc.tile.row)) {
      pool = blockDraft(pool, 'garage', "blocked in ranks 2-3")
    }
  }


  if (!game.curseOrDare && (day.day == 1 || (day.day == 2 && !game.vmode))) {
    pool = annotateRoom(pool, { blockPct: 95, blockNote: "95% chance blocked on days 1 and 2" }, 'drafting-studio')
    pool = annotateRoom(pool, { blockPct: 95, blockNote: "95% chance blocked on days 1 and 2" }, 'master-bedroom')
  }

  pool = annotateRoom(pool, { blockPct: 30, blockNote: "30% chance blocked after drafting 8 times" }, 'drafting-studio')

  return pool
}

// Remove rooms already in the house.
function removeDraftedRooms(
  pool: DraftPool,
  house: HouseState
): DraftPool {

  // TODO: how do secret passage, prism key work? 
  // Do they remove from the pool as usual?
  // Does monk block a room from being drafted in the main house?

  const houseCounts: Record<string, number> = {}
  for (const slug of house.placedRooms) {
    houseCounts[slug] = (houseCounts[slug] ?? 0) + 1
  }

  // We just remove the first of each room from the pool
  const removed: Record<string, number> = {}
  const newRooms = pool.rooms.filter(({ room }) => {
    if ((removed[room.slug] ?? 0) < houseCounts[room.slug]) {
      removed[room.slug] = (removed[room.slug] ?? 0) + 1
      return false
    } else {
      return true
    }
  })

  pool = {
    ...pool,
    rooms: newRooms
  }

  return pool
}


// Set dynamic rarities based on date and game state
// Annotates probabilistic rarities.
function setDynamicRarities(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState
): DraftPool {
  const dynamicRarities = getDynamicRarities(game, day)

  const { rarities: adHocRarities, annotations } = getAdHocRarities(game, day, house)
  Object.assign(dynamicRarities, adHocRarities)

  // Apply conservatory/gear wrench overrides, which supersede all DRs
  Object.assign(dynamicRarities, game.rarityOverrides)

  // Append rarity annotations for things we can't determine exactly
  pool = { ...pool, rarityOverrides: dynamicRarities }

  for (const [slug, notes] of Object.entries(annotations)) {
    for (const note of notes) {
      pool = annotateRoom(pool, note, slug)
    }
  }
  return pool
}


// Filters the draft pool for a particular exit in the house
function constrainForLocation(
  pool: DraftPool,
  draft: DraftParams,
): DraftPool {
  // https://www.reddit.com/r/BluePrince/comments/1ltsn1t/drafting_mechanics_room_placement_restrictions/

  // TODO:
  // - idiosyncrasies of different classrooms
  // - pawn armory
  // - chamber of mirrors rooms having different exits

  if (draft.kind == 'outer') {
    const eligible = new Set(OUTER_ROOMS)
    const ineligible = pool.rooms
      .filter(({ room }) => !eligible.has(room.slug))
      .map(({ room }) => room.slug)
    // Obviously ignoring monk
    pool = removeFromPool(pool, ineligible, "ineligible for drafting as an outer room")
  } else {

    pool = removeFromPool(pool, OUTER_ROOMS, "ineligible for drafting in the house")

    const eligible = new Set(
      getRoomsAt(draft.toLocation.tile, draft.toLocation.toDirection)
    )
    const ineligible = pool.rooms
      .filter(({ room }) => !eligible.has(room.slug))
      .map(({ room }) => room.slug)
    const loc = draft.toLocation
    const coord = `${loc.tile.column}${loc.tile.row}`
    const reason = `ineglibile for drafting ${loc.toDirection} into ${coord}`

    pool = removeFromPool(pool, ineligible, reason)
  }
  return pool
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
// Returns a vector representing the probability of each room appearing in each slot.
function draftHouse(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
  useConditionalFilters: boolean = true
): [KeyedVec, KeyedVec, KeyedVec] {

  const inLibrary = draft.fromRoomSlug == 'library'

  // Apply runback/conditional filters in advance, why not?
  const filteredPool = applyFilters(pool, game, day, house, draft, useConditionalFilters)
  const decks = initDecks(filteredPool)
  const deckMinimums = getDeckMinimums(day.day, game.vmode, game.haveRoom46)
  const { pDeckIJ, pNoneMarked } = selectDecks(decks, deckMinimums, inLibrary)
  const effectiveDecks = mergeMarkedDecks(decks, pDeckIJ)

  const rank = draft.toLocation.tile.row
  const slots: (1 | 2 | 3)[] = [1, 2, 3]

  // Prepare redraw pool in advance, since all slots use it
  let draw2pools = [KeyedVec.empty(), KeyedVec.empty(), KeyedVec.empty()]
  if (useConditionalFilters) {
    draw2pools = draftHouse(pool, game, day, house, draft, false)
  }

  // Determine the draft probability for each room and slot
  let slotPools = slots.map((slot) => {

    let slotPool = KeyedVec.empty()

    const pDeckRoll = getPDeck(
      slot, day.day,
      draft.gems || 0, rank, house.placedRooms.length - 2,
      game.vmode, house.solariumInHouse, inLibrary
    )

    // Cumulative probability of a second draw
    let pRedraw = 0

    for (const [i, deck] of effectiveDecks.entries()) {
      slotPool = slotPool.add(deck.scale(pDeckRoll.get(i)))
      pRedraw = pRedraw + pDeckRoll.get(i) * pNoneMarked.get(i)
    }

    // If the first draw fails, it will be repeated without conditional filters.
    // Precompute the resulting probabilities for all rooms, for each slot.
    if (useConditionalFilters && pRedraw > 0) {
      const draw2pool = draw2pools[slot - 1]

      // Add draw 2 results to probability mass
      slotPool = slotPool.add(draw2pool.scale(pRedraw))
    }

    return slotPool
  }) as [KeyedVec, KeyedVec, KeyedVec]

  // TODO: need to return "removed reasons" from the filtering steps,
  // currently they are lost...
  // maybe a bad idea anyway, given that conditional filters are probabilistic?

  slotPools = applyWeightedRooms(slotPools, pool, game, day, house, draft)

  return slotPools
}



// Weighted Rooms, Duct Drafting, & misc.
// https://www.reddit.com/r/BluePrince/comments/1lzdvv9/drafting_mechanics_weighted_rooms_the_library_and/
//
// We mostly don't attempt to reconcile conflicts between these mechanics.
//
function applyWeightedRooms(
  slotPools: [KeyedVec, KeyedVec, KeyedVec],
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
): [KeyedVec, KeyedVec, KeyedVec] {

  let newSlotPools = slotPools

  // Override very first draft
  if (day.day == 1 && house.placedRooms.length == 2) {
    newSlotPools = [
      KeyedVec.empty().set('bedroom', 1),
      KeyedVec.empty().set('closet', 1),
      KeyedVec.empty().set('hallway', 1)
    ]
    return newSlotPools
  }

  // Locations in house are already determined by the room being in the pool
  const weightedRooms = [
    {
      slug: 'conservatory',
      p: 0.15,
    },
    {
      slug: 'garage',
      p: 0.9,
      condition: (day.day >= 3 || game.vmode) && !game.haveWestGate
      // Also can't have been offered today, but we don't track that
    },
    {
      slug: 'garage',
      p: 0.925,
      condition: (day.day >= 3 || game.vmode) && game.haveWestGate
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
      condition: (day.day >= 2) && house.placedRooms.includes('garage') && !game.haveWestGate
      // Floor plans in 1/2 shouldn't be dead ends
      // Fan't have been offered as a weighted room yet today
    },
  ]

  // Scan for a relevant rooms once
  const toCheck = ['library', 'bookshop', ...weightedRooms.map((wr) => wr.slug)]
  const roomsInPool: string[] = pool.rooms.reduce(
    (acc, pr) => toCheck.includes(pr.room.slug) ? [...acc, pr.room.slug] : acc,
    Array<string>()
  )

  for (let i = 0; i < weightedRooms.length; i++) {
    const wr = weightedRooms[i]
    if ((wr.condition === undefined || wr.condition)
      && roomsInPool.includes(wr.slug)
      && !house.placedRooms.includes(wr.slug)
    ) {
      newSlotPools[2] = newSlotPools[2]
        .scale(1 - wr.p)
        .add(KeyedVec.empty().set(wr.slug, wr.p)
        )
      break
    }
  }

  if (draft.fromRoomSlug == 'tunnel') {
    newSlotPools[0] = KeyedVec.empty().set('tunnel', 1)
  }
  if (draft.fromRoomSlug == 'nook'
    && game.upgrades['nook'] == 'reading-nook'
    && !house.placedRooms.includes('library')  // or can it dupe?
    && roomsInPool.includes('library')
  ) {
    // tiny adjustment to not draw library if one of the first two slots has it
    const pLib12 = newSlotPools[0].get('library') + newSlotPools[1].get('library')
    newSlotPools[2] = newSlotPools[2].scale(pLib12).add(
      KeyedVec.empty().set('library', 3).scale(1 - pLib12)
    )
  }

  if (
    draft.fromRoomSlug == 'bookshop'
    && roomsInPool.includes('bookshop')
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
    newSlotPools[2] = newSlotPools[2]
      .scale(1 - pBookshop)
      .add(KeyedVec.empty().set('bookshop', pBookshop)
      )
  }

  // Cloister-of-draxus dead-end effect. 
  // Applied in validation stage; this is good enough.
  if (draft.fromRoomSlug == 'cloister'
    && game.upgrades['cloister'] == 'cloister-of-draxus'
  ) {
    // can any dead-ends be changed by upgrading? 
    // I don't think greenhouse wall changes its status.
    newSlotPools = newSlotPools.map((sp) => {
      const onlyDeadEnds = sp.map((p, k) => DEAD_ENDS.has(k) ? p : 0)
      const total = onlyDeadEnds.sum()
      if (total == 0) {
        // Return original draft if no dead-ends remain in pool
        return sp
      } else {
        return onlyDeadEnds.scale(1 / onlyDeadEnds.sum())
      }
    }) as [KeyedVec, KeyedVec, KeyedVec]
  }

  // mt holly gift shop after room 46? probably not.

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
      pDuct1,
      (1 - pDuct1) * pDuct1 + pDuct1 * pDuct23,
      (1 - pDuct1) * (1 - pDuct1) * pDuct1   // neither of 1/2
      + pDuct1 * (1 - pDuct23) * pDuct23 // 1 
      + (1 - pDuct1) * pDuct1 * pDuct23 // 2
      + pDuct1 * pDuct23 * pDuct23  // both
    ]
    const fromConnector = POWER_CONNECTOR_ROOMS.has(draft.fromRoomSlug)

    for (let s = 0; s <= 2; s++) {
      let ductPool = new KeyedVec()
      for (const [slug, p] of newSlotPools[s].entries()) {
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
      ductPool = ductPool.scale(pDuctSlots[s] / ductPool.length)
      newSlotPools[s] = newSlotPools[s]
        .scale(1 - pDuctSlots[s])
        .add(ductPool)
    }
  }

  return newSlotPools
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
): [KeyedVec, KeyedVec, KeyedVec] {

  const { outerRoomDraftCount, previouslyDraftedOuter } = draft

  // Day 1 force: first outer draft always shows root-cellar, toolshed, hovel,
  // except in vmode. 
  // Technically vmode only disables the forced first-draft if you draft it 
  // *on* day 1, but it's not worth exposing an option for that.
  if (outerRoomDraftCount === 0 && !game.vmode) {
    return [
      KeyedVec.empty<string>().set('root-cellar', 1.0),
      KeyedVec.empty<string>().set('toolshed', 1.0),
      KeyedVec.empty<string>().set('hovel', 1.0),
    ]
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
    return blueResult
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
    return [slot1, rest, rest]
  }

  // No color override: each slot's marginal distribution is the same weighted draw.
  const dist = outerWeightedDist(pBack, [])
  return [dist, dist, dist]
}


export function runDraft(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: DraftParams) {

  let slotPools: [KeyedVec, KeyedVec, KeyedVec]
  if (draft.kind == 'outer') {
    slotPools = draftOuter(game, day, house, draft)
  } else {
    slotPools = draftHouse(pool, game, day, house, draft, true)
  }

  const finalRooms = pool.rooms.map((pr) => {
    return {
      ...pr,
      pSlot: slotPools.map((sp) => sp.get(pr.room.slug) || 0)
    } as PooledRoom
  })
  return { ...pool, rooms: finalRooms }


  // weighted rooms
  // https://www.reddit.com/r/BluePrince/comments/1lzdvv9/drafting_mechanics_weighted_rooms_the_library_and/


  // fromRoom
  // handle tunnel, duct drafts, library -> rare | bookshop
  // https://www.reddit.com/r/BluePrince/comments/1lzdvv9/drafting_mechanics_weighted_rooms_the_library_and/
}

