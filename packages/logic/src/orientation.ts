import type { Direction, GridTile, Room, RoomShape } from './types'
import { ROOM_BY_SLUG } from './rooms'
import type { DraftResult, HouseDraftParams } from './draft'
import { KeyedVec } from './math'
import rawOrientations from './data/orientations.json'
import type { DayState } from './day'
import type { GameState } from './game'


type ORIENTATION_SYMBOL = '∏' | '╔' | '╗' | '╚' | '╝' | '║' | '═' | '╣' | '╠' | '╦' | '╩' | '╬'
export type Orientation = { exits: Direction[]; symbol: ORIENTATION_SYMBOL; p: number }

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

type OrientationMap = Map<ORIENTATION_SYMBOL, OrientationEntry & { rooms: string[] }>
export type OrientationResult = [OrientationMap, OrientationMap, OrientationMap]


function computeOrientations(
  pRooms: KeyedVec<string>,
  direction: Direction,
  tile: GridTile,
  day: number,
  compass: boolean,
  haveRoom46: boolean,
  greenhouseWallBroken: boolean
): OrientationMap {
  const acc = new Map<ORIENTATION_SYMBOL, OrientationEntry & { rooms: string[] }>()

  let excludedExits: Direction[] = []
  if (tile.row == 1) { excludedExits.push("S") }
  if (tile.row == 9) { excludedExits.push("N") }
  if (tile.column == "A") { excludedExits.push("W") }
  if (tile.column == "E") { excludedExits.push("E") }

  for (const [slug, pRoom] of pRooms.entries()) {
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
      const existing = acc.get(symbol)
      if (existing) {
        acc.set(symbol, {
          ...existing,
          p: existing.p + pRoom * p,
          rooms: [...existing.rooms, room.slug]
        })
      } else {
        acc.set(symbol, { shape: room.shape, exits, symbol, p: pRoom * p, rooms: [room.slug] })
      }
    }
  }

  return acc
}

export function computeOrientationProbabilities(
  result: DraftResult,
  game: GameState,
  day: DayState,
  draft: HouseDraftParams,
): OrientationResult {

  return result.slots.map(slot =>
    computeOrientations(
      slot,
      draft.toLocation.toDirection,
      draft.toLocation.tile,
      day.day,
      day.haveCompass,
      game.haveRoom46,
      game.greenhouseWallBroken
    )
  ) as [OrientationMap, OrientationMap, OrientationMap]
}
