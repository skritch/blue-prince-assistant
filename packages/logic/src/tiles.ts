import { COLUMNS } from './types'
import type { GridTile, TilePosition, Direction, TileRow } from './types'


export type DraftResult =
  | { kind: 'nonexistent' }
  | { kind: 'center' }
  | { kind: 'corner'; edges: [Direction, Direction] }
  | { kind: 'edge'; edge: Direction; entry: 'pierces' | 'edge' }

export function getTilePosition(tile: GridTile): TilePosition {
  const edges: Direction[] = []
  if (tile.row === 1) edges.push('N')
  if (tile.row === 9) edges.push('S')
  if (tile.column === 'A') edges.push('W')
  if (tile.column === 'E') edges.push('E')

  if (edges.length === 0) return { kind: 'center' }
  if (edges.length === 1) return { kind: 'edge', edge: edges[0] }
  return { kind: 'corner', edges: [edges[0], edges[1]] }
}

export function getDraftResult(tile: GridTile, direction: Direction): DraftResult {
  const col = 1 + COLUMNS.indexOf(tile.column)
  const row = tile.row as number

  const newCol = col + (direction === 'E' ? 1 : direction === 'W' ? -1 : 0)
  const newRow = row + (direction === 'S' ? 1 : direction === 'N' ? -1 : 0)

  if (newCol < 1 || newCol > 5 || newRow < 1 || newRow > 9) {
    return { kind: 'nonexistent' }
  }

  const target: GridTile = { column: COLUMNS[newCol], row: newRow as TileRow }
  const pos = getTilePosition(target)

  if (pos.kind === 'center') return { kind: 'center' }
  if (pos.kind === 'corner') return { kind: 'corner', edges: pos.edges }

  // Edge tile: pierces if we're heading straight into it, runs along it otherwise
  const pierces =
    (direction === 'N' && pos.edge === 'N') ||
    (direction === 'S' && pos.edge === 'S') ||
    (direction === 'E' && pos.edge === 'E') ||
    (direction === 'W' && pos.edge === 'W')

  return { kind: 'edge', edge: pos.edge, entry: pierces ? 'pierces' : 'edge' }
}
