
import { POOL_ADDITIONS, ROOM_46_REWARDS, ROOMS } from './rooms'
import type { DayState } from './day'
import { addToPool, annotateRoom, removeFromPool, type DraftPool } from './pool'
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

  var pool: DraftPool = {
    rooms: Object.values(game.pool).map((room) => ({ room })),
    rarityOverrides: {},
    annotations: {},
  }

  // Technically we need some state for "number of times a room has been drafted"


  pool = buildCurrentPool(pool, game, day)
  pool = setDynamicRarities(pool, game, day, house)
  pool = setDailyRarities(pool, game, day)
  pool = currentDraftLogic(pool, draft)

  // Handle per-slot logic, gems etc.

  // what determines the very first draw of the day?

  return pool.rooms.map(({ room }) => ({
    room,
    probability: 0,
    inPool: false,
  }))
}


// Step 1: build the correct pool
function buildCurrentPool(
  pool: DraftPool,
  game: GameState,
  day: DayState,
): DraftPool {
  if (game.haveRoom46) { pool = addToPool(pool, 'room46', ...ROOM_46_REWARDS) }
  if (day.poolInHouse) { pool = addToPool(pool, 'pool-in-house', ...POOL_ADDITIONS) }
  if (day.baconAndEggs) { pool = addToPool(pool, 'bacon-and-eggs', 'morning-room') }
  if (day.knightChess) { pool = addToPool(pool, 'knight-chess', 'armory') }
  if (day.aquariumExperimentActivations) {
    // TODO confirm this mechanic
    const ct = 3 * day.aquariumExperimentActivations
    pool = addToPool(pool, 'laboratory', ...Array(ct).fill('aquarium'))
  }

  // Chamber of Mirrors permanent additions
  // https://www.reddit.com/r/BluePrince/comments/1mkgzuj/chamber_of_mirrors_passive_and_permanent_effects/
  if (game.chamberOfMirrorsAdditions) {
    pool = addToPool(pool, 'chamber-of-mirrors', ...game.chamberOfMirrorsAdditions)
  }

  // V-mode additions
  // https://www.reddit.com/r/BluePrinceUncensored/comments/1t4nmpn/v_mode_what_it_is_and_what_day_1_trophy_hunters/
  if (game.vmode) {
    if (day.day < 3) { pool = removeFromPool(pool, 'study') }
    if (day.day < 3) { pool = annotateRoom(pool, { pct: 5 }, 'master-bedroom') }
    if (day.day < 5) { pool = annotateRoom(pool, { pct: 20 }, 'library') }
  }

  // Schoolhouse classrooms
  // https://www.reddit.com/r/BluePrince/comments/1lrxff0/the_mechanics_of_drafting_multiple_classrooms/
  // TODO: fairly complicated, for now we just add 8 schoolhouses
  if (day.schoolhouseInHouse) {
    pool = addToPool(pool, 'schoolhouse', ...Array(8).fill('classroom'))
  }

  // Chamber of Mirrors same-day duplicates
  // https://www.reddit.com/r/BluePrince/comments/1mkgzuj/chamber_of_mirrors_passive_and_permanent_effects/
  if (day.chamberOfMirrorsInHouse) {
    // "mirror room" list
    // if not yet drafted, will not be removed when next drafted
    //   calculate this posthoc
    // if drafted, new copy added
    //   different set of rooms? / different set of "exit lists"
    // special classroom interaction
  }


  // Should monk block a room from being drafted in the main house?


  // Remove everything already in the house?
  // - handle chamber of mirrors again
  // - handle complicated schoolhouse mechanics
  //   - punt on identifying which copy was drafted

  return pool
}


// Step 2
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

// 
function setDailyRarities(
  pool: DraftPool,
  game: GameState,
  day: DayState,
): DraftPool {

  // https://www.reddit.com/r/BluePrince/comments/1m4eer1/drafting_mechanics_conditional_filters_making/
  if (day.chessColor) { }
  if (day.scepterColor) { }
  if (day.greenhouseInHouse) { }
  if (day.furnaceInHouse) { }
  if (day.schoolhouseInHouse) { }
  if (day.southernCrossActive) { }
  if (day.draxusActive) { }

  return pool
}


// Step 3
function currentDraftLogic(
  pool: DraftPool,
  draft: DraftParams,
): DraftPool {

  // positional logic / exit list stuff
  // https://www.reddit.com/r/BluePrince/comments/1ltsn1t/drafting_mechanics_room_placement_restrictions/
  // handle mirror room special exits
  // handle schoolhouse vs normal classrooms
  // handle chamber of mirrors rooms having different exits



  // fromRoom
  // handle tunnel, duct drafts, library -> rare | bookshop
  // https://www.reddit.com/r/BluePrince/comments/1lzdvv9/drafting_mechanics_weighted_rooms_the_library_and/


  if (draft != 'outer') {
    if (draft.silverKeyUsed) { }
    if (draft.prismKeyColor) { }
    if (draft.secretPassageColor) { }
  }

  // previousDraft

  // drafting blocks
  //  - drafting studio

  // buggy/weird blocks:
  //  - tunnel
  //  - greenhouse
  //  - terrace




  return pool
}
