<script lang="ts">
  import {
    computePool,
    initGameState,
    initDay,
    initHouse,
    ROOMS,
    type GameState,
    type DayState,
    type HouseState,
    type DraftParams,
    type TileColumn,
    type TileRow,
  } from "bp-logic";
  import { loadState, saveState, persistLocally } from "../stateSerializer";
  import GameStatePanel from "./GameStatePanel.svelte";
  import DayStatePanel from "./DayStatePanel.svelte";
  import HouseStatePanel from "./HouseStatePanel.svelte";
  import DraftStatePanel from "./DraftStatePanel.svelte";
  import PoolTable from "./PoolTable.svelte";

  const loaded = loadState();

  let gameState: GameState = $state(loaded?.game ?? { ...initGameState() });
  let dayState: DayState = $state(loaded?.day ?? initDay(1));
  let houseState: HouseState = $state(loaded?.house ?? initHouse());
  let draftParams: DraftParams | undefined = $state(loaded?.draft);
  let draftKey = $state(0);
  let draftInitializer: DraftParams | undefined = $state(loaded?.draft);

  $effect(() => {
    const g = $state.snapshot(gameState) as GameState;
    const d = $state.snapshot(dayState) as DayState;
    const h = $state.snapshot(houseState) as HouseState;
    const p = draftParams;
    const timer = setTimeout(() => persistLocally(g, d, h, p), 300);
    return () => clearTimeout(timer);
  });

  function permalink() {
    saveState(gameState, dayState, houseState, draftParams);
  }

  function resetAll() {
    draftInitializer = undefined;
    gameState = { ...initGameState() };
    dayState = initDay(1);
    houseState = initHouse();
    draftParams = undefined;
    draftKey++;
  }

  function randomPreset() {
    // Helper to pick random element from array
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Get rooms by rarity
    const commonRooms = ROOMS.filter(r => r.baseRarity === 1 && !['entrance-hall', 'antechamber'].includes(r.slug));
    const standardRooms = ROOMS.filter(r => r.baseRarity === 2);
    const standardNonDeadEnd = standardRooms.filter(r => !r.tags.includes('dead-end'));

    // Pick the standard room for drafting first (non-dead-end)
    const standardForDraft = pick(standardNonDeadEnd).slug;

    // Add 3-7 commonplace rooms + 1-3 standard rooms to house
    const numCommon = randInt(3, 7);
    const numStandard = randInt(1, 3);

    // Use Set to avoid duplicates when selecting rooms
    const selectedCommonSet = new Set<string>();
    while (selectedCommonSet.size < numCommon) {
      selectedCommonSet.add(pick(commonRooms).slug);
    }
    const selectedCommon = Array.from(selectedCommonSet);

    // Include the standardForDraft plus additional random standard rooms
    const selectedStandardSet = new Set<string>([standardForDraft]);
    while (selectedStandardSet.size < numStandard) {
      selectedStandardSet.add(pick(standardRooms).slug);
    }
    const selectedStandard = Array.from(selectedStandardSet);

    // Set house rank between 1-4
    const maxRank = randInt(1, 4) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

    // Set draft location
    const columns: TileColumn[] = ['A', 'B', 'C', 'D', 'E'];
    const direction = pick(['N', 'E', 'W'] as const);
    const column = pick(columns);
    const row = maxRank as TileRow;

    // Set previous draft: standardForDraft + 2 undrafted common rooms
    const undraftedCommon = commonRooms.filter(r => !selectedCommonSet.has(r.slug));
    const previousDraft: [string, string, string] = [
      standardForDraft,
      pick(undraftedCommon).slug,
      pick(undraftedCommon).slug,
    ];

    // Maybe add found floorplans (50% chance for each)
    const possibleFloorplans = ['conservatory', 'planetarium', 'closet-exhibit', 'tunnel'];
    const foundFloorplans = possibleFloorplans.filter(() => Math.random() > 0.5);

    // Update state
    const basePool = initGameState().pool;
    const additionalRooms = foundFloorplans
      .map(slug => ROOMS.find(r => r.slug === slug))
      .filter((r): r is typeof ROOMS[number] => r !== undefined);

    gameState = {
      ...initGameState(),
      haveWestGate: true,
      pool: additionalRooms.length > 0 ? [...basePool, ...additionalRooms] : basePool,
    };

    houseState = {
      ...initHouse(),
      placedRooms: ['entrance-hall', 'antechamber', ...selectedCommon, ...selectedStandard],
      maxRank,
    };

    draftInitializer = {
      toLocation: {
        tile: { column, row },
        toDirection: direction,
      },
      fromRoomSlug: standardForDraft,
      gems: randInt(0, 3),
      isFirstDraftAtDoor: true,
      previousDraft,
    };

    draftParams = draftInitializer;
    draftKey++;
  }

  let draftPool = $derived(computePool(gameState, dayState, houseState, draftParams));
</script>

<div class="layout">
  <div class="config">
    <GameStatePanel bind:gameState />
    <DayStatePanel bind:dayState />
    <HouseStatePanel bind:houseState />
    {#key draftKey}
      <DraftStatePanel bind:draftParams initialDraft={draftInitializer} />
    {/key}
    <div class="bottom-btns">
      <button class="action-btn" onclick={permalink}>🔗</button>
      <div class="spacer"></div>
      <button class="action-btn" onclick={randomPreset}>Random preset</button>
      <button class="action-btn" onclick={resetAll}>Reset all</button>
    </div>
  </div>
  <div class="results">
    <PoolTable {draftPool} gameRarityOverrides={gameState.rarityOverrides} bind:houseState />
  </div>
</div>

<style>
  .layout {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .config {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 0 0 390px;
  }

  .bottom-btns {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .spacer {
    flex: 1;
  }

  .action-btn {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .action-btn:hover {
    background: var(--border);
    color: var(--text);
  }

  .results {
    flex: 1 1 0;
    min-width: 0;
  }

  @media (max-width: 700px) {
    .layout {
      flex-direction: column;
    }

    .config {
      flex: none;
      width: 100%;
    }
  }
</style>
