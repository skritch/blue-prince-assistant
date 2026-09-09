
import { MIRROR_ROOMS, OUTER_ROOMS, POOL_ADDITIONS, ROOM_46_REWARDS } from './rooms'
import { classifyExitTo, getRoomsAt } from './tiles'
import type { DayState } from './day'
import { addToPool, annotateRoom, blockDraft, initPool, removeFromPool, type DraftPool, type PooledRoom } from './pool'
import type { HouseState } from './house'
import { type GameState } from './game'
import { getAdHocRarities, getDynamicRarities } from './rarity'
import { draftHouse, type DraftParams, type DraftResult } from './draft'
import { draftOuter } from './draftOuter'
import { applyDraftOverrides } from './draftOverrides'
import { applyValidation } from './validation'


// Build the drafting pool, based on game conditions and unlocks
function buildbasePool(
  game: GameState,
  day: DayState,
  house: HouseState
): DraftPool {

  let pool = initPool(game)

  // --- Deterministic Additions ---

  if (game.haveRoom46) {
    pool = addToPool(pool, ROOM_46_REWARDS, 'room46')
  } else if (day.day >= 46) {
    pool = addToPool(pool, ['gallery'], 'day-46')
  }
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

  // --- Probabilistic & undeterminable odifications ---

  // V-mode additions
  // https://www.reddit.com/r/BluePrinceUncensored/comments/1t4nmpn/v_mode_what_it_is_and_what_day_1_trophy_hunters/
  if (!game.vmode) {
    // TODO is this double-counting from the drafting block?
    // I think yes.
    if (day.day < 3) { pool = annotateRoom(pool, { inPoolPct: 5 }, 'master-bedroom', "day 1/2") }
    if (day.day < 5) { pool = annotateRoom(pool, { inPoolPct: 20 }, 'library', "day 1/2") }
  }

  // Schoolhouse classrooms
  // https://www.reddit.com/r/BluePrince/comments/1lrxff0/the_mechanics_of_drafting_multiple_classrooms/
  // We are not tracking how many drafts you've seen, or how many classrooms you've drafted
  // in the past. We add one immediately with a note, and later on will prevent classrooms
  // from being removed after drafting to simulate this logic.
  if (house.schoolhouseInHouse) {
    pool = addToPool(pool, ['classroom'], 'schoolhouse')
    pool = annotateRoom(pool, { condition: "additional classrooms are added to the pool as you draft" }, 'classroom')
  }

  // TODO: how to handle such a conditional addition to the pool?
  // For now, require the day is greater than the number of drafts required.
  if (game.vmode || game.haveRoom46) {
    if (day.day >= 5) {
      pool = addToPool(pool, ['bookshop'])
    }
    pool = annotateRoom(pool, { condition: "must have drafted library 5 times" }, 'bookshop')
  } else {
    if (day.day >= 8) {
      pool = addToPool(pool, ['bookshop'])
    }
    pool = annotateRoom(pool, { condition: "must have drafted library 8 times" }, 'bookshop')
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
          pool = annotateRoom(pool, { "mirrorNote": "if drafted after CoM, draftable locations are modified" }, slug)
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

  // What mechanic actually removes study? Is it a block or "not added to pool"?
  if (day.day < 3 && !game.vmode) {
    pool = blockDraft(pool, 'study', "blocked day 1/2 unless in v-mode.")
  }


  if (draft !== undefined && draft.kind == 'house') {
    const loc = draft.toLocation
    const exit = classifyExitTo(loc.tile, loc.toDirection)
    if (exit == 'center' && ['W', 'E'].includes(loc.toDirection)) {
      // Note this block persists until next center N/S draft
      pool = blockDraft(pool, 'tunnel', "blocked when drafting W or E into a center tile until next draft N or S into a center tile")
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
  }

  // Probabilistic & undeterminable blocks


  if (day.day == 1) {
    pool = annotateRoom(pool, { blockPct: 100, blockNote: "blocked for 4:20 realtime on day 1" }, 'chapel')
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
    // Special logic simulate the gradual addition of classrooms throughout
    // the day when a schoolhouse is drafted: we just don't remove the classroom
    // from the pool after it is drafted, until all classrooms are placed.
    if (room.slug == 'classroom'
      && house.schoolhouseInHouse
      && (houseCounts[room.slug] < 8
        || (house.chamberOfMirrorsInHouse && houseCounts[room.slug] < 9))
    ) {
      return true
    }

    if ((removed[room.slug] ?? 0) < houseCounts[room.slug]) {
      removed[room.slug] = (removed[room.slug] ?? 0) + 1
      return false
    } else {
      return true
    }
  })

  return {
    ...pool,
    rooms: newRooms
  }
}


// Set dynamic rarities based on date and game state
// Annotates probabilistic rarities.
function applyDynamicRarities(
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

  pool = { ...pool, rarityOverrides: dynamicRarities }

  // Append rarity annotations for things we can't determine exactly
  for (const [slug, notes] of Object.entries(annotations)) {
    if (adHocRarities[slug] !== undefined) { continue }
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
  // - Monked outer rooms

  if (draft.kind == 'outer') {
    const eligible = new Set(OUTER_ROOMS)
    const ineligible = pool.rooms
      .filter(({ room }) => !eligible.has(room.slug))
      .map(({ room }) => room.slug)
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



    // Special Cases


    // Responsible for garage only appearing at 4+.
    // Ignoring some exit lists subtleties that don't appear to do anything
    if ([2, 3].includes(loc.tile.row)) {
      pool = removeFromPool(pool, ['garage'], "blocked in ranks 2-3")
    }

    if ((loc.tile.column == 'C' && loc.tile.row == 8) || loc.tile.row == 2) {
      pool = removeFromPool(pool, ['foundation'], "blocked in C8 and row 2")
    } else if (loc.tile.row == 3) {
      pool = annotateRoom(pool,
        { inPoolPct: 10, note: "90% chance of being removed when drafting rank 3 center tiles", },
        'foundation')
    }
  }
  return pool
}


function runDraft(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: DraftParams) {

  let draftResult: DraftResult
  if (draft.kind == 'outer') {
    draftResult = draftOuter(game, day, house, draft)
  } else {
    draftResult = draftHouse(pool, game, day, house, draft, 1)

    draftResult = applyValidation(draftResult, pool, game, day, house, draft)

    // Weighted rooms, guaranteed draws, duct draws, etc.
    // We apply these after validation, as they mostly ignore validation. This
    // will be inaccurate for some duct draws, which are validated in some cases.
    // TODO: fix? Would have to annotate duct draws separately.
    draftResult = applyDraftOverrides(draftResult, pool, game, day, house, draft)
  }

  const finalRooms = pool.rooms
    .map((pr) => {
      return {
        ...pr,
        pSlot: draftResult.slots.map((sp) => sp.get(pr.room.slug) || 0),
        pReasons: draftResult.reasons.map((r) => r[pr.room.slug]?.join('\n'))
      } as PooledRoom
    })
  return {
    ...pool,
    rooms: finalRooms,
  }
}


// Full procedure to determine the eligible pool
export function generateDraftPool(
  game: GameState,
  day: DayState,
  house: HouseState,
  draft?: DraftParams
): DraftPool {

  var pool: DraftPool

  pool = buildbasePool(game, day, house)
  pool = removeDraftedRooms(pool, house)
  if (draft !== undefined) {
    pool = constrainForLocation(pool, draft)
  }
  pool = applyDraftingBlocks(pool, game, day, draft)
  pool = applyDynamicRarities(pool, game, day, house)
  if (draft !== undefined) {
    pool = runDraft(pool, game, day, house, draft)
  }
  return pool
}
