import type { DayState } from "./day"
import { type HouseDraftParams, type DraftResult, draftHouse } from "./draft"
import type { GameState } from "./game"
import type { HouseState } from "./house"
import type { DraftPool } from "./pool"
import { DEAD_ENDS } from "./rooms"



function validateDraxus(
  draftResult: DraftResult,
) {
  let slots = draftResult.slots


  // Can any dead-ends be changed by upgrading? 
  // I don't think greenhouse wall changes its status.

  const deadEndCts = slots.map((sp) => {
    return sp.map((p, slug) => DEAD_ENDS.has(slug) ? p : 0).sum()
  })
  for (let i = 1; i <= 3; i++) {
    if (deadEndCts[i] > 0) {
      const onlyDeadEnds = slots[i].map((p, k) => DEAD_ENDS.has(k) ? p : 0)
      slots[i] = onlyDeadEnds.scale(1 / onlyDeadEnds.sum())

    }
  }
  // set reasons / removals?

  return { ...draftResult, slots }
}


function validateDeadEnds(
  draftResult: DraftResult,
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
) {
  let slots = draftResult.slots

  // 2. if 3 dead-ends, rerolls slot 2 as a non-dead-end
  //   - calculate p[all 3 dead-ends]
  //   - rescale all slot-2 probabilities accordingly
  const pDeadEnds = [1, 2, 3].map((slot) =>
    draftResult.slots[slot - 1]
      .map((p, slug) => DEAD_ENDS.has(slug) ? p : 0)
      .sum()
  )
  const p1or3isDeadEnd = pDeadEnds[0] + pDeadEnds[2] - pDeadEnds[0] * pDeadEnds[2]
  const poolWithoutDeadEnds = {
    ...pool,
    rooms: pool.rooms.filter((pr) => !DEAD_ENDS.has(pr.room.slug))
  }
  const anyDrawWithoutDeadEndsResult = draftHouse(poolWithoutDeadEnds, game, day, house, draft, "any")

  slots[1] = slots[1]
    // Rescale slot 2 dead-end probabilities
    .map((p, slug) => DEAD_ENDS.has(slug) ? p * p1or3isDeadEnd : p)
    // Add the anyDrawResult times the total probability of a dead end in slot 2
    .add(anyDrawWithoutDeadEndsResult.slots[1].scale(pDeadEnds[1]))


  return { ...draftResult, slots }
}

export function applyValidation(
  draftResult: DraftResult,
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams,
): DraftResult {

  // Restrictions
  // - skipped for prism key / secret passage
  // - ignores weighted rooms & similar in slot 3
  // - should affect duct drafts occurring before a normal draw, but
  //   we're not going to implement that.
  // 
  // When a card is invalidated, it is rerolled as an "any draw". Precompute this.
  // draftHouse(poolWithoutDeadEnds, game, day, house, draft, "any")

  // Duplicates: reroll the *first* slot with a dupe
  //   for each room in slot 1, p(dupe) = p(either slot 1 or 2 has that room)
  //   for each room in slot 2, p(dupe) = p(slot 3 has that room)

  if (
    draft.fromRoomSlug == 'cloister'
    && game.upgrades['cloister'] == 'cloister-of-draxus'
  ) {
    draftResult = validateDraxus(draftResult)
  } else {
    draftResult = validateDeadEnds(draftResult, pool, game, day, house, draft)
  }


  // 3. if slot 1 has a gem cost, rerolls it as free.
  //   - not sure how this could occur in our simulation
  //   - we ignore this.
  // 4. sort by gem cost and rarity
  //    - we ignore this.

  return draftResult
}