
import { MIRROR_ROOMS, OUTER_ROOMS, POOL_ADDITIONS, ROOM_46_REWARDS } from './rooms'
import { classifyExitTo, getRoomsAt } from './roomLocations'
import type { DayState } from './day'
import { addToPool, annotateRoom, blockDraft, fromGameState, removeFromPool, type DraftPool, type PooledRoom } from './pool'
import type { HouseState } from './house'
import { type GameState } from './game'
import { getAdHocRarities, getDynamicRarities } from './rarity'

import { applyFilters, getPDeck, initDecks, joinMarkedDecks, markDecks, type DraftParams } from './draft'
import { PVec } from './math'

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
    pool = applyLocation(pool, draft)
  }
  pool = applyDraftingBlocks(pool, game, day, draft)
  pool = setDynamicRarities(pool, game, day, house)
  if (draft !== undefined) {
    pool = applyDraftLogic(pool, game, day, house, draft)
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
  if (day.poolInHouse) { pool = addToPool(pool, POOL_ADDITIONS, 'pool-in-house') }
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
  if (day.schoolhouseInHouse) {
    pool = addToPool(pool, Array(8).fill('classroom'), 'schoolhouse')
  }


  // Chamber of Mirrors duplicates, simplified somewhat.
  // for each room already in the house and in the mirrored list
  //   add an additional copy to the pool.
  // one of the copies will then be removed when we remove the current drafts,
  // https://www.reddit.com/r/BluePrince/comments/1mkgzuj/chamber_of_mirrors_passive_and_permanent_effects/

  if (day.chamberOfMirrorsInHouse) {
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
  // TODO:
  // - try to incorporate blocks persisting from previous drafts? infeasible?

  if (!(game.haveRoom46
    || game.foundEpsenTomb
    || (game.vmode && (2 <= day.day && day.day <= 7))
    || (game.curseOrDare && (1 <= day.day && day.day <= 7))
    || day.day >= 12
  )) {
    pool = blockDraft(pool, 'her-ladyships-chamber', "blocked until Room 46, Epsen tomb, or day 12, but unblocked in v-mode before day 8")
  }

  if (!game.vmode) {
    // What mechanic actually removes study? Is it a block?
    if (day.day < 3) { pool = blockDraft(pool, 'study', "removed day 1/2, unless in v-mode") }
  }

  if (draft !== undefined && draft !== 'outer') {
    const loc = draft.toLocation
    const exit = classifyExitTo(loc.tile, loc.toDirection)
    if (exit == 'center' && ['W', 'E'].includes(loc.toDirection)) {
      // note this block persists until next center N/S draft
      pool = blockDraft(pool, 'tunnel', "blocked when drafting W or E into a center tile until next draft N or S into a center tile")
    }

    if ((loc.tile.column == 'C' && loc.tile.row == 8) || loc.tile.row == 2) {
      // Not sure if "block" is right mechanism here
      pool = blockDraft(pool, 'foundation', "blocked in C8 and row 2")
    } else if (loc.tile.row == 3) {
      // technically removes from exit list. Only applies to center tiles, but Foundation is not eligible for edges anyway
      pool = annotateRoom(pool,
        { blockPct: 90, blockNote: "blocked when drafting into rank 3 center tiles", },
        'foundation')
    }

    if (
      (['east-advance', 'west-advance'].includes(exit) && loc.tile.row == 8)
      || (['east-retreat', 'west-retreat'].includes(exit) && loc.tile.row == 2)
    ) {
      // Unintended behavior here: secret-passage is blocked until 
      // drafting some other advance/retreat on wings. Annotate?
      const reason = "blocked when drafting north into row 8 or south into row 2"
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
  // Assuming yes to both.

  const houseCounts: Record<string, number> = {}
  for (const slug of house.placedRooms) {
    houseCounts[slug] = (houseCounts[slug] ?? 0) + 1
  }

  // We just remove the first of each room from the pool
  // TODO: all of this will get much worse if we try to handle *which* copy
  //   in the pool has been drafted, e.g. if one is upgrade and one not or something.
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
function applyLocation(
  pool: DraftPool,
  draft: DraftParams,
): DraftPool {
  // https://www.reddit.com/r/BluePrince/comments/1ltsn1t/drafting_mechanics_room_placement_restrictions/

  // TODO:
  // - idiosyncrasies of different classrooms
  // - pawn armory
  // - chamber of mirrors rooms having different exits

  if (draft === 'outer') {
    const eligible = new Set(OUTER_ROOMS)
    const ineligible = pool.rooms
      .filter(({ room }) => !eligible.has(room.slug))
      .map(({ room }) => room.slug)
    pool = removeFromPool(pool, ineligible)
  } else {

    // Remove outer rooms first without giving a reason
    pool = removeFromPool(pool, OUTER_ROOMS)

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



// Most of the drafting logic is here, factored out of the main function so it
// can call itself recursively for redraws.
function draftSlots(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: DraftParams,
  useConditionalFilters: boolean = true
): [PVec, PVec, PVec] {

  // TODO
  // https://www.reddit.com/r/BluePrince/comments/1liagtk/outer_room_basic_draft_rates_effects_of_rarity/
  if (draft == 'outer') {
    return [PVec.empty(), PVec.empty(), PVec.empty()]
  }

  // Apply runback/conditional filters in advance, why not?
  const filteredPool = applyFilters(pool, game, day, draft, useConditionalFilters)
  const decks = initDecks(filteredPool)
  const { markedDecks, acceptancePs } = markDecks(decks, day.day, game.vmode, game.haveRoom46)
  const effectiveDecks = joinMarkedDecks(markedDecks)

  const rank = draft.toLocation.tile.row
  const slots: (1 | 2 | 3)[] = [1, 2, 3]

  let draw2pools = [PVec.empty(), PVec.empty(), PVec.empty()]
  if (useConditionalFilters) {
    draw2pools = draftSlots(pool, game, day, house, draft, false)
  }

  // Determine the draft probability for each room and slot
  let slotPools = slots.map((slot) => {

    let slotPool = PVec.empty()

    const pDecks = getPDeck(
      slot, day.day, draft.gems || 0, rank, house.placedRooms.length - 2, game.vmode
    )

    // Keeps track of the total probability of a second draw across
    // the 8 decks of the first draw
    let pRedraw = 0

    for (const [deckIdx, deck] of effectiveDecks.entries()) {
      const pDeck = pDecks[deckIdx]
      const pAccepted = acceptancePs[deckIdx]
      pRedraw = pRedraw + pDeck * (1 - pAccepted)
      slotPool = slotPool.add(deck.mult(pDeck * pAccepted))
    }

    console.log(`slot ${slot}, filters ${useConditionalFilters} -- pRedraw: ${pRedraw}`)

    // If the first draw fails, it will be repeated without conditional filters.
    // Precompute the resulting probabilities for all rooms, for each slot.
    if (useConditionalFilters && pRedraw > 0) {
      const draw2pool = draw2pools[slot - 1]

      // Add draw 2 results to probability mass
      slotPool = slotPool.add(draw2pool.mult(pRedraw))
    }

    console.log(`slot ${slot}, filters ${useConditionalFilters} -- slotPool: ${slotPool.sum()}`)
    return slotPool
  })

  // TODO: need to return "removed reasons" from the filtering steps,
  // currently they are lost...
  // maybe a bad idea anyway, given that conditional filters are probabilistic?

  return slotPools as [PVec, PVec, PVec]
}

// Actual Procedure, approximately:
//
// Divide into 8 decks, free|gem x 4 rarities
// First determine free vs. gem based on "Rare checks"
// Determine a "base rarity" based on rank, date, etc.
// - Start with base-rarity deck.
// - Filter it based on runback/conditional etc.
// - If it has ~3+ rooms, draw from it
//   If less but nonempty, repeat computation for other rarity decks. 
//     Select one at random and draw from it.
// If all that fails, repeat with no conditional filters active and a new rarity, 
//   but discards still discarded?
// If that fails, repeat with all decks mixed together.
// Validate: duplicates, 3x dead-ends, gem in slot 1.
//
// Our procedure to determine approximate probabilities:
// 
// Apply filters to the whole pool.
// Divide into 8 decks.
// For each slot:
// - find probability of each deck being chosen (rarity x free | gem).
// - simulate the whole deck-choice-with-fallback procedure:
//   - if not enough cards in deck, next rarity is used in priority order.
//   - if no decks have enough cards, fallback to draw 2
//   - If one deck survives, assign:
//     p(card) = p(deck) * 1/(cards in deck) 
//   - If multiple, assign for each:
//     p(card) = 1/(viable decks) * p(deck) * 1/(cards in deck)
// - for each room in the overall pool, sum the probabilities across 
//   all 8 rarity x free | gem possiblities.
// - add in the result of a redraw * the approximate probability of redrawing, 
//   summed across all choices of the original deck
// - ignore validation
//
// Returns the pool for each slot, keyed by slug, with "p" set appropriately.
export function applyDraftLogic(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: DraftParams,
  useConditionalFilters: boolean = true) {

  const slotPools = draftSlots(pool, game, day, house, draft, useConditionalFilters)
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

