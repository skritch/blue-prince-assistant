
export interface HouseState {
  placedRooms: Set<string>
  maxRank: number
}


export function initHouse(): HouseState {
  return {
    placedRooms: new Set(['entrance-hall', 'antechamber']),
    maxRank: 1
  }
}
