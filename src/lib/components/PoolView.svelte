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
    type Direction,
    type TileColumn,
    type TileRow,
  } from "bp-logic";
  import { loadState, saveState, persistLocally } from "../stateSerializer";
  import GameStatePanel from "./GameStatePanel.svelte";
  import DayStatePanel from "./DayStatePanel.svelte";
  import HouseStatePanel from "./HouseStatePanel.svelte";
  import DraftStatePanel from "./DraftStatePanel.svelte";
  import PoolTable from "./PoolTable.svelte";

  type Mode = "none" | "outer" | "house";

  const loaded = loadState();

  let gameState: GameState = $state(loaded?.game ?? { ...initGameState() });
  let dayState: DayState = $state(loaded?.day ?? initDay(1));
  let houseState: HouseState = $state(loaded?.house ?? initHouse());

  const initHouseDraft = loaded?.draft && loaded.draft !== "outer" ? loaded.draft : undefined;
  let draftMode: Mode = $state(
    !loaded?.draft ? "none" : loaded.draft === "outer" ? "outer" : "house",
  );
  let draftColumn: TileColumn = $state(initHouseDraft?.toLocation.tile.column ?? "C");
  let draftRow = $state<number>(initHouseDraft?.toLocation.tile.row ?? 2);
  let draftToDirection: Direction = $state(initHouseDraft?.toLocation.toDirection ?? "N");
  let draftFromRoomSlug = $state(initHouseDraft?.fromRoomSlug ?? "");
  let draftGems = $state(initHouseDraft?.gems ?? 0);
  let draftIsReroll = $state(!(initHouseDraft?.isFirstDraftAtDoor ?? true));
  let draftPreviousDraft = $state<[string, string, string]>(
    initHouseDraft?.previousDraft ?? ["", "", ""],
  );
  let draftKey = $state(0);

  let draftParams: DraftParams | undefined = $derived.by(() => {
    if (draftMode === "none") return undefined;
    if (draftMode === "outer") return "outer";
    const hasPreviousDraft = draftPreviousDraft.some((s) => s !== "");
    return {
      toLocation: {
        tile: { column: draftColumn, row: draftRow as TileRow },
        toDirection: draftToDirection,
      },
      fromRoomSlug: draftFromRoomSlug || undefined,
      gems: draftGems,
      isFirstDraftAtDoor: !draftIsReroll,
      previousDraft: hasPreviousDraft
        ? (draftPreviousDraft as [string, string, string])
        : undefined,
    };
  });

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
    gameState = { ...initGameState() };
    dayState = initDay(1);
    houseState = initHouse();
    draftMode = "none";
    draftColumn = "C";
    draftRow = 2;
    draftToDirection = "N";
    draftFromRoomSlug = "";
    draftGems = 0;
    draftIsReroll = false;
    draftPreviousDraft = ["", "", ""];
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

    draftMode = "house";
    draftColumn = column;
    draftRow = row;
    draftToDirection = direction;
    draftFromRoomSlug = standardForDraft;
    draftGems = randInt(0, 3);
    draftIsReroll = false;
    draftPreviousDraft = previousDraft;
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
      <DraftStatePanel
        bind:mode={draftMode}
        bind:column={draftColumn}
        bind:row={draftRow}
        bind:toDirection={draftToDirection}
        bind:fromRoomSlug={draftFromRoomSlug}
        bind:gems={draftGems}
        bind:isReroll={draftIsReroll}
        bind:previousDraft={draftPreviousDraft}
      />
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
