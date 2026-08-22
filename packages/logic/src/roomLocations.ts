import type { Direction, GridTile, Tile } from "./types";
import { getTilePosition } from "./tiles";
import rawLocations from "./data/roomLocations.json";
import { ROOMS, UNDRAFTABLE, OUTER_ROOMS } from "./rooms";

// https://www.reddit.com/r/BluePrince/comments/1ltsn1t/drafting_mechanics_room_placement_restrictions/
export type Exit =
  | 'west-advance' | 'west-retreat' | 'west-pierce'
  | 'east-advance' | 'east-retreat' | 'east-pierce'
  | 'north-edge' | 'north-pierce'
  | 'south-edge' | 'south-pierce'
  | 'corner' | 'center'
  | 'outer'

const nonCenterSet = new Set(rawLocations['non-center'])
const undraftableSet = new Set(UNDRAFTABLE)

function ew(flag: string): string[] {
  return Object.entries(rawLocations['east-west'] as Record<string, string[]>)
    .filter(([, list]) => list.includes(flag))
    .map(([slug]) => slug)
}

function ns(flag: string): string[] {
  return Object.entries(rawLocations['north-south'])
    .filter(([, list]) => list.includes(flag))
    .map(([slug]) => slug)
}

export const EXIT_LIST_ROOMS: Record<Exit, string[]> = {
  'west-advance': [...ew('west-advance'), ...ew('west')],
  'west-retreat': [...ew('west-retreat'), ...ew('west')],
  'west-pierce': ew('west-pierce'),
  'east-advance': [...ew('east-advance'), ...ew('east')],
  'east-retreat': [...ew('east-retreat'), ...ew('east')],
  'east-pierce': ew('east-pierce'),
  'north-edge': ns('north'),
  'south-edge': ns('south'),
  'north-pierce': ns('north-pierce'),
  'south-pierce': ns('south-pierce'),
  'corner': [...rawLocations['corners']],
  'center': ROOMS
    .filter(r => r.directoryPage !== 9 && !nonCenterSet.has(r.slug) && !undraftableSet.has(r.slug))
    .map(r => r.slug),
  'outer': OUTER_ROOMS
}

export function classifyExitTo(tile: GridTile, toDirection: Direction): Exit {
  const pos = getTilePosition(tile)

  if (pos.kind === 'center') return 'center'
  if (pos.kind === 'corner') return 'corner'

  const { edge } = pos
  if (edge === 'N') return toDirection === 'N' ? 'north-pierce' : 'north-edge'
  if (edge === 'S') return toDirection === 'S' ? 'south-pierce' : 'south-edge'
  if (edge === 'W') {
    if (toDirection === 'W') return 'west-pierce'
    return toDirection === 'N' ? 'west-advance' : 'west-retreat'
  }
  // edge === 'E'
  if (toDirection === 'E') return 'east-pierce'
  return toDirection === 'N' ? 'east-advance' : 'east-retreat'
}

export function getRoomsAt(tile: GridTile, toDirection: Direction): string[] {
  return EXIT_LIST_ROOMS[classifyExitTo(tile, toDirection)]
}
