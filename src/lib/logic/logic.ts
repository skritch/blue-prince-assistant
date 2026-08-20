
import { POOL_ADDITIONS, ROOM_46_REWARDS, ROOMS } from '../data/rooms'
import type { DayState } from './day'
import { addRooms, type DraftOdds, type DraftParams, type DraftPool } from './draft'
import type { HouseState } from './house'
import type { PoolState } from './pool'


export function computeOdds(
  globalPool: PoolState,
  day: DayState,
  _draft: DraftParams,
  _house: HouseState,
): DraftOdds[] {


  // Step 2: determine current daily rarities
  // - apply chess, furnace, greenhouse, scepter, etc.
  // - mail, coat check, etc.

  // Step 3: modify pool appropriately for current draft
  // - based on location, direction
  // - remove things used in the previous draft, maybe?

  // Step 4: apply per-slot logic and overrides
  // - gems
  // - silver key
  // - prism key, secret passage
  // - blocks
  // - previous draft
  // - monk, bookshop


  return ROOMS.map((room) => ({
    room,
    probability: 0,
    inPool: false,
  }))
}


// Step 1
function buildCurrentPool(
  globalPool: PoolState,
  day: DayState,
): DraftPool {
  // Step 1: build the correct pool
  var pool: DraftPool = {
    rooms: { ...globalPool.pool },
    rarityOverrides: {}
  }

  // need helper functions for by slug to draft pool
  // mutate or pure?
  if (globalPool.haveRoom46) { pool = addRooms(pool, ...ROOM_46_REWARDS) }
  if (day.poolInHouse) { pool = addRooms(pool, ...POOL_ADDITIONS) }
  if (day.baconAndEggs) { pool = addRooms(pool, 'morning-room') }
  if (day.knightChess) { pool = addRooms(pool, 'armory') }


  // TODO
  if (day.schoolhouseInHouse) { }
  if (day.aquariumExperimentActivations) { }
  if (day.chamberOfMirrorsInHouse) { }
  // monk is handled later


  // Remove everything already in the house?
  // Or maybe do this later?

  return pool
}


// Step 2
function modifyDailyRarities(
  globalPool: PoolState,
  pool: DraftPool,
  day: DayState,
): DraftPool {

  // incorpoate globalPool.rarityOverrides
  // add current date logic

  if (day.chessColor) { }
  if (day.scepterColor) { }
  if (day.greenhouseInHouse) { }
  if (day.furnaceInHouse) { }
  if (day.coatCheckUsed) { }
  if (day.mailRoomUsed) { }
  if (day.schoolhouseInHouse) { }
  if (day.southernCrossActive) { }
  if (day.draxusActive) { }

  return pool
}