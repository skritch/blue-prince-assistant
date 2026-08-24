/** 1 = commonplace, 2 = standard, 3 = unusual, 4 = rare, null = special */
export type Rarity = 1 | 2 | 3 | 4 | null
export type RoomColor = 'blue' | 'purple' | 'orange' | 'green' | 'gold' | 'red' | 'black'
export type Direction = 'N' | 'S' | 'E' | 'W'
export type TileColumn = 'A' | 'B' | 'C' | 'D' | 'E'
export const COLUMNS: TileColumn[] = ['A', 'B', 'C', 'D', 'E']
export type TileRow = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type GridTile = { column: TileColumn; row: TileRow }
export type Tile = GridTile | 'outer'
export type TilePosition =
  | { kind: 'center' }
  | { kind: 'edge'; edge: Direction }
  | { kind: 'corner'; edges: [Direction, Direction] }



export interface Upgrade {
  name?: string
  description?: string
  color?: RoomColor[]
  tags?: string[]
}

/** Shape of an entry in rooms.json */
export interface Room {
  name: string
  slug: string
  assetPath: string
  color: RoomColor[]
  baseRarity: Rarity
  baseGemCost: number
  doors: number | null
  directoryPage: number  // 1-9
  roomNumber: number
  tags: string[]
  description: string | null
}

