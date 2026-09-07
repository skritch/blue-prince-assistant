import type { DayState } from "./day";
import type { DraftParams } from "./draft";
import type { GameState } from "./game";
import type { HouseState } from "./house";
import type { DraftPool } from "./pool";


export type State = {
  pool: DraftPool
  game: GameState
  day: DayState
  house: HouseState
  draft: DraftParams
}