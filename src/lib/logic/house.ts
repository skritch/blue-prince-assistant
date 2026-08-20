
export interface HouseState {
  placedRooms: Set<string>
}


export function initHouse(): HouseState {
  return {
    placedRooms: new Set(['entrance-hall', 'antechamber']),
  }
}
