import keyLists from './data/keyLists.json';
import type { DayState } from './day';
import { draftHouse, type HouseDraftParams } from './draft';
import type { GameState } from './game';
import type { HouseState } from './house';
import { KeyedVec } from './math';
import { initSpecificPool, setProbabilities, type DraftPool } from './pool';
import { ROOMS_BY_COLOR, UPGRADE_LOOKUP } from './rooms';
import { classifyExitTo, type Exit } from './tiles';
import { removeFirst } from './utils';


export type PrismColor = 'purple' | 'orange' | 'green' | 'gold' | 'red'

const prismaticPools = keyLists["Prismatic"]
const prismaticSpecial = keyLists["Prismatic Special"]
const prismaticDefaults = keyLists["Prismatic Defaults"] as Record<PrismColor, string[]>
const silverIgnored = keyLists["silver_ignored"]

// I've omitted the exceptions at the south edge, as these doors can't be locked.
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

function getExitLists(pool: DraftPool, draft: HouseDraftParams) {
  const exit = classifyExitTo(
    draft.toLocation.tile,
    draft.toLocation.toDirection)
  const overrides = (exitListOverrides as Record<string, Record<string, null | string | string[]>>)[getOverrideName(exit)]

  const exitLists: Record<string, string[]> = {
    "free": [],
    "common gem": [],
    "rare gem": []
  }
  for (const pr of pool.rooms) {
    let list: string | null = null
    if (overrides[pr.room.slug] !== undefined) {
      if (Array.isArray(overrides[pr.room.slug])) {
        // special case of rooms on multiple exit lists
        (overrides[pr.room.slug] as string[]).forEach((l2) => {
          exitLists[l2] = [...exitLists[l2], pr.room.slug]
        })
        continue
      } else {
        list = overrides[pr.room.slug] as string | null
      }
    } else if (pr.room.baseGemCost == 0) {
      list = "free"
    } else if (pr.room.baseRarity && [3, 4].includes(pr.room.baseRarity)) {
      list = "rare gem"
    } else if (pr.room.baseRarity && [1, 2].includes(pr.room.baseRarity)) {
      list = "common gem"
    }
    if (list !== null) {
      exitLists[list] = [...exitLists[list], pr.room.slug]
    }
    if (exit == 'north-pierce'
      && (list == 'rare gem' || list == 'common gem')) {
      // Special case: north pierce gem lists are doubled
      exitLists[list] = [...exitLists[list], pr.room.slug]
    }
  }

  // TODO office on west is retreat only?

  return exitLists
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
  house: HouseState,
  draft: HouseDraftParams & { secretPassageColor: PrismColor }
): DraftPool {

  const keyColor = draft.secretPassageColor

  const poolForColor: DraftPool = {
    ...pool,
    rooms: pool.rooms.
      filter((pr) => {
        if (pr.upgrade && pr.upgrade.color) {
          return pr.upgrade.color.includes(keyColor)
        }
        return pr.room.color.includes(keyColor)
      })
  }
  const exitLists = getExitLists(poolForColor, draft)


  const exit = classifyExitTo(
    draft.toLocation.tile,
    draft.toLocation.toDirection)

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
    exitLists['free'],
    exitLists['rare gem'],
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
    { list: exitLists['free'], redraw: true },
    { list: exitLists['rare gem'], redraw: true },
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
    { list: [...exitLists['common gem'], ...exitLists['rare gem']], redraw: true },
    { list: exitLists['free'], redraw: true },
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
    ...poolForColor.rooms.map(pr => pr.room.slug),
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

// TODO: figure out how to determine the probability of validation here. For now, skipping it.
// TODO: aquarium experiments. tomorrow hallways.
export function draftSilver(
  pool: DraftPool,
  game: GameState,
  day: DayState,
  house: HouseState,
  draft: HouseDraftParams
): DraftPool {

  const pool4 = {
    ...pool,
    rooms: pool.rooms.filter((pr) =>
      (pr.room.doors == 4
        || pr.room.slug == 'chamber-of-mirrors')
      && !(silverIgnored.includes(pr.room.slug))
    )
  }
  const pool3 = {
    ...pool,
    rooms: pool.rooms.filter((pr) =>
      (pr.room.doors >= 3
        || pr.room.slug == 'chamber-of-mirrors'
        || pr.room.slug == 'locker-room')
      && !(silverIgnored.includes(pr.room.slug))
    )
  }
  const pool2 = {
    ...pool,
    rooms: pool.rooms.filter((pr) =>
      (pr.room.doors >= 2
        || pr.room.slug == 'chamber-of-mirrors'
        || pr.room.slug == 'locker-room'
        || pr.room.slug == 'secret-passage')
      && !(silverIgnored.includes(pr.room.slug))
    )
  }

  const exitLists4 = getExitLists(pool4, draft)
  const exitLists3 = getExitLists(pool3, draft)
  const exitLists2 = getExitLists(pool2, draft)
  const allExits3 = [
    ...exitLists3['free'],
    ...exitLists3['common gem'],
    ...exitLists3['rare gem']
  ]
  const allExits2 = [
    ...exitLists2['free'],
    ...exitLists2['common gem'],
    ...exitLists2['rare gem']
  ]

  const regularDraw = draftHouse(pool, game, day, house, draft, 1)

  let slots = [
    KeyedVec.empty<string>(),
    KeyedVec.empty<string>(),
    KeyedVec.empty<string>()
  ] as [KeyedVec, KeyedVec, KeyedVec]


  // Slot 1
  // Draw a Free Exit room from the 3-Way List.
  // Draw a Free Exit room from the 2-Way List.
  // Make a random Free Draw without using the Silver Key.
  const slot1Lists = [
    exitLists3['free'],
    exitLists2['free']
  ]
  const slot1choice = slot1Lists.find((list) => list.length > 0)
  if (slot1choice) {
    slots[0] = KeyedVec.uniform(slot1choice)
  } else {
    slots[0] = regularDraw.slots[0]
  }


  // Slot 2
  // If you currently have 4 Gems or more, Slot 2 makes the following attempts:
  // - Draw an All Exit room from the 3-Way List.
  // - Draw an All Exit room from the 2-Way List.
  // - Make a random Free Draw without using the Silver Key.
  // If you have less than 4 Gems, then Slot 2 will make the same attempts, but limit itself to the Free Exit rooms.
  // Chooses a list if it's nonempty, tries to draw 3 times, otherwise free draw
  let slot2Lists
  if (draft.gems >= 4) {
    slot2Lists = [allExits3, allExits2]
  } else {
    slot2Lists = [
      exitLists3['free'],
      exitLists2['free']
    ]
  }

  let slot2 = KeyedVec.empty()
  for (const [s1, p1] of slots[0].entries()) {
    let done = false
    for (let list of slot2Lists) {
      // exit lists can have dupes, so just remove the first instance
      list = removeFirst(list, s => s == s1)
      if (list.length > 0) {
        slot2 = slot2.add(KeyedVec.uniform(list).scale(p1))
        done = true
        break
      }
    }
    if (!done) {
      slot2 = slot2.add(regularDraw.slots[0].scale(p1))
    }
  }
  slots[1] = slot2

  //   Slot 3
  // There is a 40% chance that Slot 3 will begin by making the following attempts:
  // - Draw a Gem Exit room from the 4-Way List.
  // - Draw a Gem Exit room from the 3-Way List.
  // If the 40% chance fails, or there are no available Gem Exit rooms in the 3-Way List, then Slot 3 continues with these attempts instead:
  // - Draw an All Exit room from the 3-Way List.
  // - Draw an All Exit room from the 2-Way List.
  // Make a random Free Draw without using the Silver Key.
  // Chooses a list if it's nonempty, tries to draw 3 times, otherwise free draw... or gem? (Ignoring this case.)
  const slot3ListsA = [
    [...exitLists4['common gem'], ...exitLists4['rare gem']],
    [...exitLists3['common gem'], ...exitLists3['rare gem']]
  ]
  const slot3ListsB = [allExits3, allExits2]
  const plistsA = 0.4
  let slot3 = KeyedVec.empty()

  // Nested list. Could get big if slot 2 fell back to a free draw.
  for (const [s1, p1] of slots[0].entries()) {
    for (const [s2, p2] of slots[1].entries()) {
      let done = false
      for (let list of slot3ListsA) {
        list = removeFirst(list, s => s1 == s)
        list = removeFirst(list, s => s2 == s)
        if (list.length > 0) {
          slot3 = slot3.add(KeyedVec.uniform(list).scale(plistsA * p1 * p2))
          // If the list produced a result, we're done
          done = true
          break
        }
      }

      for (let list of slot3ListsB) {
        list = removeFirst(list, s => s1 == s)
        list = removeFirst(list, s => s2 == s)
        if (list.length > 0) {
          const p = (1 - plistsA) * p1 * p2
            + (!done ? plistsA * p1 * p2 : 0)  // we fell back

          slot3 = slot3.add(KeyedVec.uniform(list).scale(p))
          done = true
          break
        }
      }
      if (!done) {
        slot3 = slot3.add(regularDraw.slots[0].scale(p1 * p2))
      }
    }
  }
  slots[2] = slot3


  return setProbabilities(
    pool,
    slots
  )
}
