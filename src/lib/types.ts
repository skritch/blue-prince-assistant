export type Rarity = 'commonplace' | 'standard' | 'unusual' | 'rare' | 'special'

export type RoomColor = 'blue' | 'purple' | 'orange' | 'green' | 'gold' | 'red' | 'black'

export type Direction = 'N' | 'S' | 'E' | 'W'

/** Shape of an entry in rooms.json */
export interface RoomData {
  name: string
  slug: string
  assetPath: string
  color: RoomColor | RoomColor[]
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


export interface DirectoryConfig {
  // Drafting Studio, found floorplans, etc.
  unlockedRooms: string[]
  haveRoom46: boolean              // Adds Gallery, Room 8

  // Conservatory / Gear Wrench permanent rarity shifts; slug → overridden rarity
  rarityOverrides: Record<string, Rarity>
}

/**
 * Within-day config. Either user-provided or derived from day state.
 * Excludes:
 *   - directory state
 *   - placed room list, per-draft conditions (location, key type)
 */
export interface DailyDraftConfig {
  day: number

  // Affects how many floor plans are drawn per draft
  gems: number

  // --- Dynamic pool modifiers ---
  knightChess: boolean             // Adds Armory
  labExperimentsActive: boolean    // (Laboratory) adds extra Aquariums to pool
  chamberOfMirrorsInHouse: boolean // adds same-day duplicates of already-placed rooms
  poolInHouse: boolean             // adds Locker Room, Sauna, Pump Room

  // --- Dynamic rarity modifiers ---
  chessColor: RoomColor | null    // Chess piece color boost (null = inactive)
  scepterColor: RoomColor | null  // Royal Scepter color boost (null = inactive)
  furnaceInHouse: boolean          // Red rooms more likely
  greenhouseInHouse: boolean       // Green rooms more likely
  southernCrossActive: boolean     // Boosts certain rooms
  draxusActive: boolean            // Dead ends more common
  mailRoomUsed: boolean            // Mail Room rarity effect triggers after first use
  coatCheckUsed: boolean           // Coat Check rarity effect triggers after first use

  // Both
  schoolhouseInHouse: boolean      // Alters Library rarity and adds classrooms

  // Any other chess mechanics?
  // What's the mechanic that removes things from the pool? Blue crown? What else?
  // Scrubber thing
  // Day after freezer?
}

/**
 * Draft state.
 */
export interface DraftConfig {
  location: string  // A7, e.g.
  direction: Direction

  // determines duct drafting, library, reading nook, tunnel
  fromRoom: string
  silverKeyUsed: boolean
  room8KeyUsed: boolean
  prismKeyColor: RoomColor | null
  secretPassage: RoomColor | null  // need to omit black, blue

  // Can't see the same room two times in a row or something
  // Except sometimes you can
  previousDraws: string[]
}


export interface RunState {
  day: number
  /** Room slugs already placed in the house */
  placedRooms: Set<string>
}

export interface DraftOdds {
  room: Room
  /** Probability this room appears as one of the 3 draft choices (0–1) */
  probability: number
  /** Whether this room is currently in the pool */
  inPool: boolean
  /** Why it's excluded, if applicable */
  exclusionReason?: string
}
