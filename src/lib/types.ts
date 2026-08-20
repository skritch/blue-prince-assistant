export type Rarity = 'commonplace' | 'standard' | 'unusual' | 'rare' | 'special'
export type RoomColor = 'blue' | 'purple' | 'orange' | 'green' | 'gold' | 'red' | 'black'
export type Direction = 'N' | 'S' | 'E' | 'W'
export type TileColumn = 'A' | 'B' | 'C' | 'D' | 'E'
export type TileRow = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9


/** Shape of an entry in rooms.json */
export interface RoomData {
  name: string
  slug: string
  assetPath: string
  color: RoomColor[]
  baseRarity: Rarity
  baseGemCost: number
  doors: number | null
  directoryPage: number  // 1-9
  roomNumber: number
  deadEnd: boolean
}

/** Runtime room — RoomData plus any computed/derived fields */
export interface Room extends RoomData {
  /** Rooms that, when placed, remove this room from the pool */
  excludedBy?: string[]
}


