
export interface HouseState {
  placedRooms: string[]
  maxRank: number



  foundationDrafted: boolean        // Lowers Master Bedroom; raises Billiard Room on day 7+
  schoolhouseInHouse: boolean      // Alters Library rarity and adds classrooms
  chamberOfMirrorsInHouse: boolean // adds same-day duplicates of already-placed rooms
  poolInHouse: boolean             // adds Locker Room, Sauna, Pump Room
  furnaceInHouse: boolean          // Red rooms more likely
  greenhouseInHouse: boolean       // Green rooms more likely
  solariumInHouse: boolean         // Rare rooms more likely
}


export function initHouse(): HouseState {
  return {
    placedRooms: ['entrance-hall', 'antechamber'],
    maxRank: 1, foundationDrafted: false, schoolhouseInHouse: false,
    chamberOfMirrorsInHouse: false,
    poolInHouse: false,
    furnaceInHouse: false,
    greenhouseInHouse: false,
    solariumInHouse: false,
  }
}
