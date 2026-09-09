import type { DayState } from "./day"
import type { HouseDraftParams } from "./draft"
import type { GameState } from "./game"
import type { HouseState } from "./house"
import { type DraftPool, type PooledRoom } from "./pool"
import { LIBRARY_IGNORED } from "./rooms"
import { type Rarity, type RoomColor } from "./types"
import { partition } from "./utils"


const COLOR_P: Record<RoomColor, number> = {
  'blue': 0.4,
  'black': 0.4,
  'purple': 0.28,
  'orange': 0.3,
  'gold': 0.3,
  'green': 0.4,
  'red': 0.3
}
const PATIO_FILTER_BASE = ['patio', 'veranda', 'greenhouse', 'morning-room']

type ConditionalFilter = (pr: PooledRoom) => [string, number | null]

export type FilterResult = { p: number, failReason?: string }

export function colorFilter(color: RoomColor): ConditionalFilter {
  return (pr: PooledRoom) => {
    const roomColors = pr.upgrade?.color || pr.room.color
    return [color, roomColors.includes(color) ? COLOR_P[color] : null]
  }
}

function roomFilter(slugs: string[], p: number, name: string): ConditionalFilter {
  return (pr: PooledRoom) => [name, slugs.includes(pr.room.slug) ? p : null]

}

function tagFilter(tag: string, p: number, name?: string): ConditionalFilter {
  return (pr: PooledRoom) => {
    const hasTag = (pr.upgrade?.tags || []).includes(tag) || pr.room.tags.includes(tag)
    return [name || tag, hasTag ? p : null]
  }
}



export function getConditionalFilters(
  game: GameState,
  day: DayState,
  house: HouseState,
) {
  // https://www.reddit.com/r/BluePrince/comments/1m4eer1/drafting_mechanics_conditional_filters_making/

  const colors = [... new Set([
    day.chessColor,
    day.scepterColor,
    house.greenhouseInHouse && 'green' as RoomColor,
    house.furnaceInHouse && 'red' as RoomColor
  ].filter((s) => (s !== null) && (s !== false)))]

  let patioFilter
  if (house.greenhouseInHouse) {
    patioFilter = roomFilter(PATIO_FILTER_BASE, 0.5, 'patio')
  } else {
    patioFilter = roomFilter([...PATIO_FILTER_BASE, 'secret-passage'], 0.05, 'patio')
  }

  const minorBumpFilter = roomFilter([
    'classroom',
    (day.day > 4 || game.vmode) && 'garage',
    house.greenhouseInHouse && 'secret-passage',
    (day.aquariumExperimentActivations || 0) > 0 && 'aquarium'
  ].filter((s) => (s !== false)), 0.03, 'minor bump')

  const majorBumpFilter = roomFilter([
    'observatory', 'commissary',
    (day.aquariumExperimentActivations || 0) > 0 && 'aquarium'
  ].filter((s) => (s !== false)), 0.13, 'major bump')

  const filters: ConditionalFilter[] = [
    ...colors.map(c => colorFilter(c)),
    patioFilter,
    house.schoolhouseInHouse && roomFilter(['classroom', 'dormitory', 'library'], 0.3, 'schoolhouse'),
    day.southernCrossActive && roomFilter([
      'rotunda', 'passageway', 'great-hall', 'cloister', 'archives', 'weight-room', 'vestibule'
    ], 0.4, 'southern cross'),
    // TODO: greenhouse upgrade should *remove* dead-end tag, but draxus still consider it 
    day.draxusActive && tagFilter("dead-end", 0.3),
    day.haveChronograph && tagFilter("tomorrow", 0.4),
    day.haveElectromagnet && tagFilter("mechanical", 0.4),
    minorBumpFilter,
    majorBumpFilter,
  ].filter((s) => (s !== false && s !== undefined))

  return filters
}



export function applyConditionalFilters(
  pr: PooledRoom,
  filters: ConditionalFilter[]
): FilterResult {

  const results: [string, number | null][] = filters.map(f => f(pr))

  const [passable, failed] = partition(results, ([, p]) => (p !== null))
  if (passable.length === 0) {
    return {
      p: 0,
      failReason: `did not pass any conditional filters: ${failed.map(([n,]) => n).join(", ")}`
    }
  }
  const failChance = passable.reduce((acc, [_, p]) => acc * (1 - p!), 1)
  return {
    p: 1 - failChance,
  }
}


const RUNBACK_P_BY_RARITY = {
  1: 0.6,
  2: 0.8,
  3: 0.9,
  4: 0.99
}


export function applyRunbackFilter(
  pr: PooledRoom,
  rarity: Rarity,
  previousDraft: [string, string, string],
  isFirstDraftAtDoor: boolean
): FilterResult {
  const isRunback = previousDraft.includes(pr.room.slug)
  if (isRunback) {
    // probabilistic based on rarity to first draft at a door
    // otherwise always filters
    if (isFirstDraftAtDoor) {
      return {
        p: 1 - RUNBACK_P_BY_RARITY[rarity]
      }
    } else {
      return {
        p: 0,
        failReason: "seen in previous draft"
      }
    }
  } else {
    return { p: 1 }
  }
}


export function applyLibraryFilter(
  pr: PooledRoom,
  gems: number
) {
  if (
    LIBRARY_IGNORED['always'].has(pr.room.slug)
    || (gems < 2 && LIBRARY_IGNORED['belowTwoGems'].has(pr.room.slug))
    || (gems >= 2 && LIBRARY_IGNORED['twoOrMoreGems'].has(pr.room.slug))
  ) {
    return {
      p: 0,
      failReason: "library"
    }
  } else {
    return { p: 1 }
  }
}


// Apply all filters to produce a modified DraftPool.
export function applyFilters(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
  useConditionalFilters: boolean = true
): DraftPool {

  const condFilters = getConditionalFilters(game, day, house)

  // first apply non-conditional filters
  let filteredPool = pool.rooms.map((pr) => {
    const filterResults: FilterResult[] = []

    // Discard Filter -> omitted

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

    // Double Down Filter -> omitted

    // Library Filter
    if (draft.fromRoomSlug == 'library') {
      filterResults.push(applyLibraryFilter(pr, draft.gems))
    }

    // Ignore Filter -> freezer, rumpus, blue crown -> omitted

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
    filteredPool, ([, fr]) => (fr.failReason === undefined)
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