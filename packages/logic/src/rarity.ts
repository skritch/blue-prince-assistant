import type { Rarity } from './types'
import rawOverrides from './data/rarityOverrides.json'
import type { GameState } from './game'
import type { DayState } from './day'
import type { HouseState } from './house'
import { ROOMS } from './rooms'

export type DayString = "1" | "2" | "3-4" | "5-7"

export function dayToKey(day: number): DayString | null {
  if (day === 1) return '1'
  if (day === 2) return '2'
  if (day >= 3 && day <= 4) return '3-4'
  if (day >= 5 && day <= 7) return '5-7'
  return null
}


export interface RarityOverride {
  slug: string
  default: Rarity
  daily?: Record<DayString, NonNullable<Rarity>>,
  vmode_day1?: Rarity,
  vmode_day1_reset?: boolean
}

export const RARITY_OVERRIDES: RarityOverride[] = rawOverrides as RarityOverride[]


export function getDynamicRarities(
  game: GameState,
  day: DayState): Record<string, Rarity> {
  // https://www.reddit.com/r/BluePrince/comments/1lnn4y6/dynamic_rarity_room_rarity_changes_behind_the/
  // https://www.reddit.com/r/BluePrinceUncensored/comments/1t4nmpn/v_mode_what_it_is_and_what_day_1_trophy_hunters/

  // Set default overrides
  const dynamicRarities: Record<string, Rarity> = {}
  for (const o of RARITY_OVERRIDES) {
    dynamicRarities[o.slug] = o.default
  }

  // Apply daily overrides if this day did not start on V-mode
  // TODO: interaction with curse_or_dare, which applies vmode *before* day 1?
  //   How does workshop end up with no DR on curse/dare?
  // TODO: what exactly is meant by "week 2 rates"?
  //   Why does the vmode article say these start day 6 rather than 8?
  if (!game.haveRoom46 && (game.curseOrDare || day.day === 1)) {
    const key = dayToKey(day.day)
    if (key !== null) {
      for (const o of RARITY_OVERRIDES) {
        const r = o.daily?.[key]
        if (r !== undefined) dynamicRarities[o.slug] = r
      }
    }
  }
  // If day-1, apply ad-hoc v-mode corrections
  if (!game.curseOrDare && (game.vmode && day.day === 1)) {
    for (const o of RARITY_OVERRIDES) {
      if (o.vmode_day1_reset) {
        delete dynamicRarities[o.slug]
      } else if (o.vmode_day1 !== undefined) {
        dynamicRarities[o.slug] = o.vmode_day1
      }
    }
  }

  return dynamicRarities
}

export interface AdHocRarityResult {
  rarities: Record<string, Rarity>
  annotations: Record<string, { rarityNote: string }[]>
}

export function getAdHocRarities(
  game: GameState,
  day: DayState,
  house: HouseState,
): AdHocRarityResult {
  const rarities: Record<string, Rarity> = {}
  const annotations: Record<string, { rarityNote: string }[]> = {}

  function annotate(slug: string, note: string) {
    annotations[slug] = [...(annotations[slug] ?? []), { rarityNote: note }]
  }

  // Various conditional rules.
  // First the certain / deterministic ones.
  if (!game.haveRoom46 && !game.haveWestGate && day.day > 2) {
    rarities['utility-closet'] = 1
  }
  if (day.mailRoomUsed) {
    rarities['mail-room'] = 1
  }
  if (game.upgrades['cloister']) {
    rarities['cloister'] = 2
  }
  // Rarity bumps?
  if (day.aquariumExperimentActivations) {
    rarities['aquarium'] = 1
    annotate('aquarium', 'aquarium experiement: common')
  }
  if (house.placedRooms.includes('her-ladyships-chamber')) {
    rarities['boudoir'] = 1
    rarities['walk-in-closet'] = 1
  }

  // Master Bedroom (deterministic branch only)
  if (!day.haveDraftedFoundation && (day.day <= 9 || !game.haveRoom46)) {
    rarities['master-bedroom'] = 4
  }

  // Foundation
  if (house.maxRank >= 4) {
    if (game.haveRoom46 || game.vmode) {
      rarities['foundation'] = 3
    } else if (day.day >= 21) {
      rarities['foundation'] = 2
    } else if (day.day >= 7) {
      rarities['foundation'] = 3
    }
  }

  // Workshop & Boiler (gear wrench = certain)
  if (day.haveGearWrench) {
    rarities['workshop'] = 2
    rarities['boiler-room'] = 2
    annotate('workshop', 'gear wrench: standard')
    annotate('boiler-room', 'gear wrench: standard')
  }

  // Terrace (rank 3 = certain base rarity)
  if (house.maxRank >= 3) {
    rarities['terrace'] = day.day === 1 ? 3 : 2
  }

  // TODO: possible schoolhouse -> classroom?


  // Any rules with a % chance, or which depend on "number of times drafted", is noted as an annotation for now.

  // Chamber of Mirrors
  if (day.day > 10 && !game.haveRoom46) {
    annotate('chamber-of-mirrors', `~${Math.min(100, 8 * (day.day - 10))}% cumulative chance already standard`)
  }

  // Drafting Studio
  // Possible deduce from "studio additions"?
  annotate('drafting-studio', 'becomes rare once drafted 4-7 times')

  // Guest Bedroom
  if (!game.haveRoom46) {
    annotate('guest-bedroom', '50% chance of standard once drafted 5+ times')
  }

  // Master Bedroom (probabilistic branch)
  if (day.haveDraftedFoundation && day.day >= 7) {
    annotate('master-bedroom', '30% chance drops to standard (foundation drafted, day 7+)')
    annotate('billiard-room', '30% chance rises to unusual (foundation drafted, day 7+)')
  }

  // Lavatory
  annotate('lavatory', '40% chance of unusual once drafted 3+ times')

  // Workshop & Boiler (probabilistic, when no gear wrench)
  if (!day.haveGearWrench) {
    if (day.day >= 17 || game.haveRoom46) {
      annotate('workshop', '40% chance of standard (day 17+ or room46)')
      annotate('boiler-room', '60% chance of standard (day 17+ or room46)')
    }
    if (day.haveBatteryPack) {
      annotate('workshop', 'battery pack: 50% chance standard or unusual')
    }
  }

  // Electromagnet
  if (day.haveElectromagnet) {
    for (const room of ROOMS.filter(r => r.mechanical)) {
      annotate(room.slug, 'electromagnet biases mechanical rooms')
    }
  }

  // Chronograph
  if (day.haveChronograph) {
    for (const room of ROOMS.filter(r => r.tomorrow)) {
      annotate(room.slug, 'chronograph biases tomorrow rooms')
    }
  }

  // Mail Room
  annotate('mail-room', 'becomes commonplace after receiving a package')

  // Coat check
  if (day.coatCheckUsed) {
    annotate('coat-check', 'exact effect of an item in coat check on rarity is not known')
  }
  if (day.coatCheckDraftedToday > 0) {
    annotate('coat-check', `coat check becomes less common after being drafted`)
  }

  // Terrace (probabilistic on top of certain base above)
  if (house.maxRank >= 3 && day.day > 1) {
    annotate('terrace', '40% chance of commonplace')
  }

  return { rarities, annotations }
}

