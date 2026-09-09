import type { DayState } from "./day";
import { draftHouse, type DraftResult, type HouseDraftParams } from "./draft";
import type { GameState } from "./game";
import type { HouseState } from "./house";
import { KeyedVec } from "./math";
import { initSpecificPool, setProbabilities, type DraftPool, type PooledRoom } from "./pool";
import { MIRROR_ROOMS, OUTER_BERRIES } from "./rooms";




export function draftBerryHouse(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
): DraftResult {
  const draftResult = draftHouse(
    pool,
    game,
    day,
    house,
    { ...draft, fromRoomSlug: 'library' },
    1
  )

  return {
    slots: [KeyedVec.empty(), KeyedVec.empty(), draftResult.slots[2]],
    reasons: [{}, {}, draftResult.reasons[2]]
  }
}

export function draftBerryOuter(
  game: GameState,
  house: HouseState
) {
  const berryCounts = OUTER_BERRIES
  const countsInHouse = house.placedRooms.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)

  const draftableCounts = Object.entries(berryCounts).map(([slug, ct]) => {
    let result: number
    if (house.chamberOfMirrorsInHouse && MIRROR_ROOMS[slug]) {
      // First copy drafted doesn't remove.
      result = Math.max(Math.min(ct + 1 - (countsInHouse[slug] || 0), ct), 0)
    } else {
      result = Math.max(ct - (countsInHouse[slug] || 0), 0)
    }
    return [slug, result] as [string, number]
  })
  const draftResult = (new KeyedVec(new Map(draftableCounts)))
    .normalize()

  let fakePool: DraftPool = initSpecificPool(
    [...Object.keys(OUTER_BERRIES)],
    game.upgrades
  )

  return setProbabilities(
    fakePool,
    [KeyedVec.empty(), KeyedVec.empty(), draftResult]
  )
}