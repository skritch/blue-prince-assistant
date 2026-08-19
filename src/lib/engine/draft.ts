import { ROOMS } from '../data/rooms'
import type { DraftOdds, Room, RunState } from '../types'

export function getActivePool(state: RunState): Room[] {
  return ROOMS.filter((room) => {
    if (state.placedRooms.has(room.slug)) return false
    if (room.excludedBy?.some((slug) => state.placedRooms.has(slug))) return false
    return true
  })
}

export function computeOdds(state: RunState): DraftOdds[] {
  const pool = getActivePool(state)
  const totalWeight = pool.reduce((sum, r) => sum + rarityWeight(r), 0)

  return ROOMS.map((room) => {
    const inPool = pool.some((r) => r.slug === room.slug)
    if (!inPool) {
      const exclusionReason = state.placedRooms.has(room.slug)
        ? 'Already placed'
        : room.excludedBy?.some((slug) => state.placedRooms.has(slug))
          ? 'Excluded by placed room'
          : undefined
      return { room, probability: 0, inPool: false, exclusionReason }
    }
    const weight = rarityWeight(room)
    const pNotChosen = Math.pow(1 - weight / totalWeight, 3)
    return { room, probability: 1 - pNotChosen, inPool: true }
  })
}

function rarityWeight(room: Room): number {
  // TODO: replace with actual game weights once confirmed
  switch (room.baseRarity) {
    case 'commonplace': return 4
    case 'standard':    return 3
    case 'unusual':     return 2
    case 'rare':        return 1
    case 'special':     return 0
  }
}
