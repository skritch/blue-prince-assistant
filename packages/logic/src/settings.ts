export interface SpoilerSettings {
  westGate: boolean
  room46: boolean
  allRooms: boolean
  allItems: boolean
  precipiceAccessed: boolean
  precipiceSolved: boolean
  giftShop: boolean
  entireGame: boolean
}

export function initSpoilerSettings(): SpoilerSettings {
  return {
    westGate: false,
    room46: false,
    allRooms: false,
    allItems: false,
    precipiceAccessed: false,
    precipiceSolved: false,
    giftShop: false,
    entireGame: false,
  }
}
