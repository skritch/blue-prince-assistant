import type { Direction, GridTile, Room, RoomShape } from './types'
import { ROOM_BY_SLUG } from './rooms'
import type { DraftResult, HouseDraftParams } from './draft'
import { KeyedVec } from './math'
import rawOrientations from './data/orientations.json'
import type { DayState } from './day'
import type { GameState } from './game'



// One symbol is used for all dead-ends, but we display them differently on the frontend.
type ORIENTATION_SYMBOL = '∏' | '╔' | '╗' | '╚' | '╝' | '║' | '═' | '╣' | '╠' | '╦' | '╩' | '╬'
export type Orientation = { exits: Direction[]; symbol: ORIENTATION_SYMBOL; p: number }

export const DEAD_END_DIRECTIONS = {
  "N": "⫪",
  "S": "⫫",
  "E": "⫤",
  "W": "⊨"
}

const OPPOSITE: Record<Direction, Direction> = { N: 'S', S: 'N', E: 'W', W: 'E' }

type RotEntry = { exits: string[]; symbol: ORIENTATION_SYMBOL; all?: number; day1_2?: number; day3_20?: number; day3plus?: number; day21plus?: number; compass?: number }
const ROT = rawOrientations as Record<string, Record<string, RotEntry[]>>

function selectP(e: RotEntry, day: number, compass: boolean, haveRoom46: boolean): number {
  if (compass && e.compass !== undefined) return e.compass
  if (e.all !== undefined) return e.all
  if (day <= 2 || haveRoom46) return e.day1_2 ?? 0
  if (day <= 20 && e.day3_20 !== undefined) return e.day3_20
  return e.day21plus ?? e.day3plus ?? 0
}

const MIRROR_SYMBOL: Partial<Record<ORIENTATION_SYMBOL, ORIENTATION_SYMBOL>> = { '╔': '╗', '╗': '╔', '╚': '╝', '╝': '╚', '╣': '╠', '╠': '╣' }

function mirrorEW(orientations: Orientation[]): Orientation[] {
  return orientations.map(o => ({
    p: o.p,
    symbol: MIRROR_SYMBOL[o.symbol] ?? o.symbol,
    exits: o.exits.map(d => d === 'E' ? 'W' : d === 'W' ? 'E' : d) as Direction[],
  }))
}

export function getOrientationProbabilities(
  shape: RoomShape,
  facing: Direction,
  day: number,
  compass: boolean,
  haveRoom46: boolean
): Orientation[] {
  const back = OPPOSITE[facing]

  if (shape === '∏') return [{ exits: [back], symbol: '∏', p: 1 }]
  if (shape === '|') {
    if (facing === 'N' || facing === 'S') {
      return [{ exits: ['N', 'S'], symbol: '║', p: 1 }]
    } else {
      return [{ exits: ['E', 'W'], symbol: '═', p: 1 }]
    }
  }
  if (shape === '＋') return [{ exits: ['N', 'S', 'E', 'W'], symbol: '╬', p: 1 }]

  const entries = ROT[shape]?.[facing === 'W' ? 'E' : facing]
  if (!entries) return []

  const orientations = entries.map(e => ({
    exits: e.exits as Direction[],
    symbol: e.symbol,
    p: selectP(e, day, compass, haveRoom46)
  }))
  return facing === 'W' ? mirrorEW(orientations) : orientations
}


type OrientationEntry = {
  shape: RoomShape
  exits: Direction[]
  symbol: ORIENTATION_SYMBOL
  p: number
}

type OrientationPs = Partial<Record<ORIENTATION_SYMBOL, OrientationEntry & { rooms: string[] }>>
export type OrientationResult = [OrientationPs, OrientationPs, OrientationPs]


function computeOrientations(
  pRooms: KeyedVec<string>,
  direction: Direction,
  tile: GridTile,
  day: number,
  compass: boolean,
  haveRoom46: boolean,
  greenhouseWallBroken: boolean
): OrientationPs {
  const acc: OrientationPs = {}

  let excludedExits: Direction[] = []
  if (tile.row == 1) { excludedExits.push("S") }
  if (tile.row == 9) { excludedExits.push("N") }
  if (tile.column == "A") { excludedExits.push("W") }
  if (tile.column == "E") { excludedExits.push("E") }

  for (const [slug, pRoom] of pRooms.entries()) {
    if (pRoom <= 0) continue
    const room = ROOM_BY_SLUG[slug]
    if (!room) continue

    let orientations: Orientation[]

    // Various orientation overrides entirely
    if ((slug == 'security' && day == 1) || (slug == 'throne-room')) {
      if (direction == 'N') { orientations = [{ exits: ['S', 'W', 'E'], symbol: '╦', p: 1 }] }
      else if (direction == 'S') { orientations = [{ exits: ['N', 'W', 'E'], symbol: '╩', p: 1 }] }
      else if (direction == 'W') { orientations = [{ exits: ['S', 'N', 'E'], symbol: '╠', p: 1 }] }
      else { orientations = [{ exits: ['N', 'S', 'W'], symbol: '╣', p: 1 }] }
    }
    else if (slug == 'patio') {
      if (tile.column == 'A') { orientations = [{ exits: ['S', 'E'], symbol: '╔', p: 1 }] }
      else { orientations = [{ exits: ['N', 'W'], symbol: '╝', p: 1 }] }
    }
    else if (slug == 'morning-room') {
      if (tile.column == 'A') { orientations = [{ exits: ['N', 'W'], symbol: '╚', p: 1 }] }
      else { orientations = [{ exits: ['S', 'E'], symbol: '╗', p: 1 }] }
    }
    else if (slug == 'boiler-room') {
      // Boiler room is treated like an L for the purpsoes of determining probabilities
      orientations = getOrientationProbabilities('⎾', direction, day, compass, haveRoom46)
      const extraBoilerExits = {
        "╔": ["W", "╦"], "╗": ["N", "╣"], "╝": ["E", "╩"], "╚": ["S", "╠"]
      } as Record<"╔" | "╗" | "╝" | "╚", [Direction, ORIENTATION_SYMBOL]>

      orientations = orientations.map(o => ({
        ...o,
        exits: [...o.exits, extraBoilerExits[o.symbol as "╔" | "╗" | "╝" | "╚"][0]],
        symbol: extraBoilerExits[o.symbol as "╔" | "╗" | "╝" | "╚"][1]
      }))

    } else {
      // Normal orientation logic
      orientations = getOrientationProbabilities(room.shape, direction, day, compass, haveRoom46)

      if (slug == 'greenhouse' && greenhouseWallBroken) {
        orientations = orientations.map(o => ({
          ...o,
          exits: [...o.exits, tile.column == "A" ? "E" : "W"],
          symbol: tile.column == "A" ? "╚" : "╗"
        }))
      }
    }

    // Remove orientations which would exit the house, and normalize
    // If no orientations survive, use the originals.
    let allowed = orientations
      .filter(o => !o.exits.some(d => excludedExits.includes(d)))
    if (allowed.length > 0) {
      const totalP = allowed.reduce((s, o) => s + o.p, 0)
      orientations = allowed.map(o => ({ ...o, p: o.p / totalP }))
    }

    for (const { exits, symbol, p } of orientations) {
      const existing = acc[symbol]
      if (existing) {
        acc[symbol] = {
          ...existing,
          p: existing.p + pRoom * p,
          rooms: [...existing.rooms, room.slug]
        }
      } else {
        acc[symbol] = { shape: room.shape, exits, symbol, p: pRoom * p, rooms: [room.slug] }
      }
    }
  }

  return acc
}

export function computeOrientationProbabilities(
  pRooms: DraftResult["slots"],
  game: GameState,
  day: DayState,
  draft: HouseDraftParams,
): OrientationResult {

  return pRooms.map(slot =>
    computeOrientations(
      slot,
      draft.toLocation.toDirection,
      draft.toLocation.tile,
      day.day,
      day.haveCompass,
      game.haveRoom46,
      game.greenhouseWallBroken
    )
  ) as [OrientationPs, OrientationPs, OrientationPs]
}

type DoorEntry = { p: number; rooms: string[] }
type DirectionPs = Partial<Record<Direction, DoorEntry>>
type PairKey = `${Direction}${Direction}`
type PairPs = Partial<Record<PairKey, DoorEntry & { directions: [Direction, Direction] }>>

export type DirectionResult = [DirectionPs, DirectionPs, DirectionPs]
export type PairResult = [PairPs, PairPs, PairPs]

const DIRECTION_ORDER: Direction[] = ['N', 'E', 'S', 'W']

export function computeDirectionProbabilities(
  orientations: OrientationResult,
  toDirection: Direction
): DirectionResult {
  const entryDir = OPPOSITE[toDirection]
  const dirs = DIRECTION_ORDER.filter(d => d !== entryDir)

  return orientations.map(slot => {
    const acc: DirectionPs = {}
    for (const entry of Object.values(slot)) {
      for (const dir of entry.exits) {
        if (!dirs.includes(dir)) continue
        const existing = acc[dir]
        if (existing) {
          existing.p += entry.p
          existing.rooms.push(...entry.rooms)
        } else {
          acc[dir] = { p: entry.p, rooms: [...entry.rooms] }
        }
      }
    }
    return acc
  }) as DirectionResult
}

export function computePairProbabilities(
  orientations: OrientationResult,
  toDirection: Direction
): PairResult {
  const entryDir = OPPOSITE[toDirection]
  const dirs = DIRECTION_ORDER.filter(d => d !== entryDir)

  const pairs: [Direction, Direction][] = []
  for (let i = 0; i < dirs.length; i++) {
    for (let j = i + 1; j < dirs.length; j++) {
      pairs.push([dirs[i], dirs[j]])
    }
  }

  return orientations.map(slot => {
    const acc: PairPs = {}
    for (const entry of Object.values(slot)) {
      for (const [d1, d2] of pairs) {
        if (!entry.exits.includes(d1) || !entry.exits.includes(d2)) continue
        const key: PairKey = `${d1}${d2}`
        const existing = acc[key]
        if (existing) {
          existing.p += entry.p
          existing.rooms.push(...entry.rooms)
        } else {
          acc[key] = { p: entry.p, rooms: [...entry.rooms], directions: [d1, d2] }
        }
      }
    }
    return acc
  }) as PairResult
}
