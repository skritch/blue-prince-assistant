import keyLists from './data/keyLists.json';
import type { DayState } from './day';
import type { DraftResult, HouseDraftParams } from './draft';
import type { GameState } from './game';
import type { HouseState } from './house';
import { KeyedVec } from './math';
import { addToPool, initPool, initSpecificPool, setProbabilities, type DraftPool, type PooledRoom } from './pool';
import { ROOMS_BY_COLOR, UPGRADE_LOOKUP } from './rooms';
import { classifyExitTo, type Exit } from './tiles';


export type PrismColor = 'purple' | 'orange' | 'green' | 'gold' | 'red'

const prismaticPools = keyLists["Prismatic"]
const prismaticSpecial = keyLists["Prismatic Special"]
const prismaticDefaults = keyLists["Prismatic Defaults"] as Record<PrismColor, string[]>
// I eyeballed the overrides lists, I might have missed a few.
const exitListOverrides = keyLists["Exit List Overrides"]

const exitToPrismaticLists: Partial<Record<Exit, (keyof typeof prismaticPools)[]>> = {
  center: ['Center'],
  'north-pierce': ['North / South Pierce'],
  'south-pierce': ['North / South Pierce'],
  'west-advance': ['Edgecreep West', 'Edge Advance West'],
  'west-retreat': ['Edgecreep West', 'Edge Retreat West'],
  'east-advance': ['Edgecreep East', 'Edge Advance East'],
  'east-retreat': ['Edgecreep East', 'Edge Retreat East'],
  'east-pierce': ['Edgepierce West', 'Edgepierce Gem'],
  'west-pierce': ['Edgepierce East', 'Edgepierce Gem'],
}


function getOverrideName(exit: Exit) {
  if (['north-edge', 'south-edge'].includes(exit)) {
    return 'north-south'
  } else if (['north-pierce', 'south-pierce'].includes(exit)) {
    return 'north-south pierce'
  } else if (['west-advance', 'west-retreat', 'east-advance', 'east-retreat'].includes(exit)) {
    return 'east-west'
  } else if (['east-pierce', 'west-pierce'].includes(exit)) {
    return 'east-west pierce'
  } else {
    return exit
  }
}

// Essentially the exact prismatic key algorithm, except that we have no way
// of handling that fact that merely *drawing* from the prismatic pool will 
// permanently remove a room from that pool, even if it is not drafted.
// 
// TODO: add a config to manage the prismatic pool?
// TODO: is this correct in the corners? Will a green key pull a cloister,
// aquarium, courtyard?
export function draftPrismatic(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams & { secretPassageColor: PrismColor }
): DraftPool {
  const keyColor = draft.secretPassageColor

  const exit = classifyExitTo(
    draft.toLocation.tile,
    draft.toLocation.toDirection)
  const overrides = (exitListOverrides as any)[getOverrideName(exit)]

  // Use the actual pool for the basic "exit list"
  const poolRooms = pool.rooms.
    filter((pr) => {
      if (pr.upgrade && pr.upgrade.color) {
        return pr.upgrade.color.includes(keyColor)
      }
      return pr.room.color.includes(keyColor)
    })

  // Build the three room lists for this color and location
  const roomLists: Record<string, string[]> = {
    "free": [],
    "common gem": [],
    "rare gem": []
  }
  poolRooms
    .map((pr) => {
      let list = null
      if (overrides[pr.room.slug] !== undefined) {
        list = overrides[pr.room.slug]
      } else if (pr.room.baseGemCost == 0) {
        list = "free"
      } else if (pr.room.baseRarity && [3, 4].includes(pr.room.baseRarity)) {
        list = "rare gem"
      } else if (pr.room.baseRarity && [1, 2].includes(pr.room.baseRarity)) {
        list = "common gem"
      }
      return [pr.room.slug, list]
    })
    .forEach(([slug, list]) => {
      if (list !== null) {
        roomLists[list] = [...roomLists[list], slug]
      }
    })

  function hasColor(slug: string) {
    if (game.upgrades[slug] !== undefined) {
      const upgrade = UPGRADE_LOOKUP[slug][game.upgrades[slug]]
      if (upgrade.color !== undefined) {
        return upgrade.color.includes(keyColor)
      }
    }
    return ROOMS_BY_COLOR[keyColor].includes(slug)
  }

  // Build the prismatic pool for this color and location
  const prismaticPool = exitToPrismaticLists[exit]
    ?.map((list) => prismaticPools[list])
    .reduce((acc, cur) => [...acc, ...cur], [])
    .filter(hasColor) || []

  const prismaticSansSpecial = prismaticPool
    .filter((slug) => !prismaticSpecial.includes(slug))
    .filter(hasColor)
  const prismaticSansDrafted = prismaticPool
    .filter((slug) => !house.placedRooms.includes(slug))
    .filter(hasColor)


  const prismaticDefault = prismaticDefaults[keyColor]
  // Special case: switch default to solarium is cloister is no longer green
  if (keyColor == 'green' && !hasColor('cloister')) {
    prismaticDefault[2] = 'solarium'
  }

  let slots = [
    KeyedVec.empty<string>(),
    KeyedVec.empty<string>(),
    KeyedVec.empty<string>()
  ] as [KeyedVec, KeyedVec, KeyedVec]

  // Slot 1:
  // Draw from the Common Free and Rare Free Exit Lists combined.
  // Draw from the Rare Gem Exit List.
  // Draw from the Prismatic Pool, ignoring Special Rooms.
  // Draw Room #1 from the Default List
  const slot1Lists = [
    roomLists['free'],
    roomLists['rare gem'],
    prismaticSansSpecial
  ]
  const slot1choice = slot1Lists.find((list) => list.length > 0)
  if (slot1choice) {
    slots[0] = KeyedVec.uniform(slot1choice)
  } else {
    slots[0] = KeyedVec.empty().set(prismaticDefault[0], 1)
  }

  // Slot 2:
  // Draw from Common Free and Rare Free Exit Lists combined. Redraw if dupe.
  // Draw from Rare Gem Exit List. Redraw if dupe.
  // Draw from the Prismatic Pool, ignoring any rooms already drafted.
  // Draw from the Prismatic Pool, ignoring Special Rooms.
  // Draw Room #2 from the Default List, or draw Room #1 if dupe.

  let slot2Lists = [
    { list: roomLists['free'], redraw: true },
    { list: roomLists['rare gem'], redraw: true },
    { list: prismaticSansDrafted, redraw: false },
    { list: prismaticSansSpecial, redraw: false },
  ]
  let slot2 = KeyedVec.empty<string>()

  for (const [s1, p1] of slots[0].entries()) {
    let done = false
    for (const { list, redraw } of slot2Lists) {
      if (redraw) {
        if (list.length > 1 || (list.length == 1 && list[0] != s1)) {
          slot2 = slot2.add(
            KeyedVec.uniform(list).set(s1, 0).normalize().scale(p1)
          )
          // If the list produced a result, we're done
          done = true
          break
        }
      } else if (list.length > 0) {
        slot2 = slot2.add(KeyedVec.uniform(list).scale(p1))
        done = true
        break
      }
    }
    if (!done) {
      const fallback = (prismaticDefault[1] != s1)
        ? prismaticDefault[1] : prismaticDefault[0]
      slot2 = slot2.add(KeyedVec.one(fallback, p1))
    }
  }


  slots[1] = slot2

  // Slot 3:
  // From the Common Gem or Rare Gem Exit Lists. Redraw up to twice on dupe.
  // Draw the Common Free or Rare Free Exit List. Redraw up to twice on dupe.
  // Draw from the Prismatic Pool, ignoring any rooms already drafted.
  // Draw from the Prismatic Pool, ignoring Special Rooms.
  // Draw Room #3 from the Default List for this color, fall back to #1 or #2.

  let slot3Lists = [
    { list: [...roomLists['common gem'], ...roomLists['rare gem']], redraw: true },
    { list: roomLists['free'], redraw: true },
    { list: prismaticSansDrafted, redraw: false },
    { list: prismaticSansSpecial, redraw: false },
  ]
  let slot3 = KeyedVec.empty<string>()

  // Nested loop, but at most about 100 pairs * 4 lists.
  for (const [s1, p1] of slots[0].entries()) {
    for (const [s2, p2] of slots[1].entries()) {
      let done = false
      for (let { list, redraw } of slot3Lists) {
        if (redraw) {
          list = list.filter((slug) => slug != s1 && slug != s2)
        }
        if (list.length > 0) {
          slot3 = slot3.add(KeyedVec.uniform(list).scale(p1 * p2))
          // If the list produced a result, we're done
          done = true
          break
        }
      }
      if (!done) {
        let fallback
        if (prismaticDefault[2] != s1 && prismaticDefault[2] != s2) {
          fallback = prismaticDefault[2]
        } else if (prismaticDefault[1] != s1 && prismaticDefault[1] != s2) {
          fallback = prismaticDefault[1]
        } else {
          fallback = prismaticDefault[0]
        }
        slot3 = slot3.add(KeyedVec.one(fallback, p1 * p2))
      }
    }
  }
  slots[2] = slot3

  // We need to output a fake pool of only rooms of the current color,
  // possibly including rooms that cannot be drafted at this location,
  // and account for any upgrades which have changed room colors.
  // TODO: Do we need to special case add the armory here?

  const allCandidates = new Set([
    ...poolRooms.map(pr => pr.room.slug),
    ...prismaticPool,
    ...prismaticSansSpecial,
    ...prismaticSansDrafted,
    ...prismaticDefault
  ])

  const fakePool: DraftPool = initSpecificPool(
    [...allCandidates],
    game.upgrades,
  )

  return setProbabilities(
    fakePool,
    slots
  )
}