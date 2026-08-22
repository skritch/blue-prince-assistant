
import { MIRROR_ROOMS, POOL_ADDITIONS, ROOM_46_REWARDS } from './rooms'
import { getRoomsAt } from './roomLocations'
import type { DayState } from './day'
import { addToPool, annotateRoom, fromGameState, removeFromPool, type DraftPool } from './pool'
import type { HouseState } from './house'
import { type GameState } from './game'
import { applyAdHocRarities, generateDynamicRarities } from './rarity'

import type { DraftParams } from './draft'
import type { DraftOdds } from './draftResult'


export function computeOdds(
  game: GameState,
  day: DayState,
  draft: DraftParams,
  house: HouseState,
): DraftOdds[] {

  var pool: DraftPool = fromGameState(game)

  // Technically we need some state for "number of times a room has been drafted"


  pool = buildCurrentPool(pool, game, day, house)
  pool = removeDraftedRooms(pool, house)
  pool = setDynamicRarities(pool, game, day, house)
  pool = setConditionalFilters(pool, game, day)
  pool = filterDraftPool(pool, draft)

  // Handle per-slot logic, gems etc.

  // what determines the very first draw of the day?

  return pool.rooms.map(({ room }) => ({
    room,
    probability: 0,
    inPool: false,
  }))
}


export function computePool(
  game: GameState,
  day: DayState,
  house: HouseState,
  draft?: DraftParams
): DraftPool {

  var pool: DraftPool = fromGameState(game)

  pool = buildCurrentPool(pool, game, day, house)
  pool = removeDraftedRooms(pool, house)
  pool = setDynamicRarities(pool, game, day, house)
  if (draft !== undefined) {
    pool = filterDraftPool(pool, draft)
  }
  return pool
}




// Step 1: build the correct pool
function buildCurrentPool(
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
  if (game.vmode) {
    if (day.day < 3) { pool = removeFromPool(pool, ['study']) }
    if (day.day < 3) { pool = annotateRoom(pool, { pct: 5 }, 'master-bedroom') }
    if (day.day < 5) { pool = annotateRoom(pool, { pct: 20 }, 'library') }
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
          annotateRoom(pool, { "mirrorNote": "will only be mirrored if drafted after CoM" })
        } else if (mirroredModifier == "modified") {
          annotateRoom(pool, { "mirrorNote": "if drafted after CoM, will modified drafting rules" })
        }
      }
    }
  }

  return pool
}

// Step 2: Remove rooms already in the house.
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
  // TODO: all of this will get much worse if we try to handle *which* copy in the pool
  //   has been drafted, e.g. if one is upgrade and one not or something.
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


// Step 3
function setDynamicRarities(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState
): DraftPool {
  const dynamicRarities = generateDynamicRarities(game, day)

  const { rarities: adHocRarities, annotations } = applyAdHocRarities(game, day, house)
  Object.assign(dynamicRarities, adHocRarities)

  // Possibly should be something in here involving upgrade disks?

  // Apply conservatory/gear wrench overrides, which supersede all DRs
  Object.assign(dynamicRarities, game.rarityOverrides)

  pool = { ...pool, rarityOverrides: dynamicRarities }
  for (const [slug, notes] of Object.entries(annotations)) {
    for (const note of notes) {
      pool = annotateRoom(pool, note, slug)
    }
  }
  return pool
}


// Step 4
function filterDraftPool(
  pool: DraftPool,
  draft: DraftParams,
): DraftPool {
  // positional logic / exit list stuff
  // https://www.reddit.com/r/BluePrince/comments/1ltsn1t/drafting_mechanics_room_placement_restrictions/

  const eligible = new Set(
    draft === 'outer'
      ? getRoomsAt('outer')
      : getRoomsAt(draft.toLocation.tile, draft.toLocation.fromDirection)
  )
  return { ...pool, rooms: pool.rooms.filter(({ room }) => eligible.has(room.slug)) }
}

// Step 5
function applyDraftLogic(
  pool: DraftPool,
  draft: DraftParams,
): DraftPool {


  if (draft != 'outer') {
    if (draft.keyUsed) { }
    if (draft.secretPassageColor) { }
  }

  // handle schoolhouse vs normal classrooms?
  // handle chamber of mirrors rooms having different exits?

  // weighted rooms
  // https://www.reddit.com/r/BluePrince/comments/1lzdvv9/drafting_mechanics_weighted_rooms_the_library_and/


  // fromRoom
  // handle tunnel, duct drafts, library -> rare | bookshop
  // https://www.reddit.com/r/BluePrince/comments/1lzdvv9/drafting_mechanics_weighted_rooms_the_library_and/

  // previousDraft

  // outer room stuff:
  // https://www.reddit.com/r/BluePrince/comments/1liagtk/outer_room_basic_draft_rates_effects_of_rarity/
  return pool
}


// Step 6
function setConditionalFilters(
  pool: DraftPool,
  game: GameState,
  day: DayState,
): DraftPool {

  // https://www.reddit.com/r/BluePrince/comments/1m4eer1/drafting_mechanics_conditional_filters_making/
  // Multiple "conditional filters" apply at once.
  // Rooms need to be accepted by one of them to be drawn.
  // I don't think multiple of the same filter stack...
  // Need to deal with upgraded rooms having different colors

  // classrooms filter
  // powered electromagnet mechanical filter
  // chronograph -> tomorrow
  // southern cross
  // draxus





  if (day.chessColor) { }
  if (day.scepterColor) { }
  if (day.greenhouseInHouse) { }
  if (day.furnaceInHouse) { }
  if (day.schoolhouseInHouse) { }
  if (day.southernCrossActive) { }
  if (day.draxusActive) { }

  return pool
}
