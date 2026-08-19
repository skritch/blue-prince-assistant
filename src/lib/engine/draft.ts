import { ROOMS } from '../data/rooms'
import type { DraftOdds, Room, RunState } from '../types'

/**
 * Returns the active pool for a given run state — rooms that can
 * currently appear in a draft.
 */
export function getActivePool(state: RunState): Room[] {
  return ROOMS.filter((room) => {
    if (state.placedRooms.has(room.id)) return false
    if (room.excludedBy?.some((id) => state.placedRooms.has(id))) return false
    return true
  })
}

/**
 * Computes draft appearance probability for each room in the pool.
 * Placeholder: currently returns equal weight across pool.
 */
export function computeOdds(state: RunState): DraftOdds[] {
  const pool = getActivePool(state)
  const totalWeight = pool.reduce((sum, r) => sum + rarityWeight(r), 0)

  return ROOMS.map((room) => {
    const inPool = pool.some((r) => r.id === room.id)
    if (!inPool) {
      const exclusionReason = state.placedRooms.has(room.id)
        ? 'Already placed'
        : room.excludedBy?.some((id) => state.placedRooms.has(id))
          ? 'Excluded by placed room'
          : undefined
      return { room, probability: 0, inPool: false, exclusionReason }
    }
    const weight = rarityWeight(room)
    // P(appears in 3-choice draft) = 1 - P(not chosen in any of 3 slots)
    const pNotChosen = Math.pow(1 - weight / totalWeight, 3)
    return { room, probability: 1 - pNotChosen, inPool: true }
  })
}

function rarityWeight(room: Room): number {
  // TODO: replace with actual game weights once rules are confirmed
  switch (room.rarity) {
    case 'common': return 4
    case 'uncommon': return 2
    case 'rare': return 1
  }
}
