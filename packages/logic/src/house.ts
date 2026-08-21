
export interface HouseState {
  placedRooms: string[]
  maxRank: number
}


export function initHouse(): HouseState {
  return {
    placedRooms: ['entrance-hall', 'antechamber'],
    maxRank: 1
  }
}
