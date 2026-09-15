<script lang="ts">
  import { untrack } from "svelte";
  import {
    computePool,
    initGameState,
    initGameFull,
    initDay,
    initHouse,
    ROOMS,
    roomsForPage,
    type GameState,
    type DayState,
    type HouseState,
    type DraftParams,
    type OuterDraftParams,
    type Direction,
    type TileColumn,
    type TileRow,
    type PrismColor,
    type DraftPool,
    type OrientationResult,
  } from "bp-logic";
  import type { SpoilerSettings } from "../spoilerSettings";
  import { loadState, saveState, persistLocally } from "../stateSerializer";
  import { loadPanelOpen } from "../panelState";
  import GameStatePanel from "./GameStatePanel.svelte";
  import DayStatePanel from "./DayStatePanel.svelte";
  import HouseStatePanel from "./HouseStatePanel.svelte";
  import DraftStatePanel from "./DraftStatePanel.svelte";
  import PoolTable from "./PoolTable.svelte";
  import RoomListView from "./RoomListView.svelte";
  import DoorPctView from "./DoorPctView.svelte";

  let { spoilerSettings = $bindable() }: { spoilerSettings: SpoilerSettings } =
    $props();

  type ViewMode = "room-pct" | "room-list" | "door-pct";

  type Mode = "none" | "outer" | "house";

  const loaded = loadState();

  let gameState: GameState = $state(loaded?.game ?? { ...initGameState() });
  let dayState: DayState = $state(loaded?.day ?? initDay(1));
  let houseState: HouseState = $state(loaded?.house ?? initHouse());

  const initHouseDraft =
    loaded?.draft && loaded.draft.kind == "house" ? loaded.draft : undefined;
  let draftMode: Mode = $state(!loaded?.draft ? "none" : loaded.draft.kind);
  let draftColumn: TileColumn = $state(
    initHouseDraft?.toLocation.tile.column ?? "C",
  );
  let draftRow = $state<number>(initHouseDraft?.toLocation.tile.row ?? 2);
  let draftToDirection: Direction = $state(
    initHouseDraft?.toLocation.toDirection ?? "N",
  );
  let draftFromRoomSlug = $state(initHouseDraft?.fromRoomSlug ?? "");
  let draftGems = $state(initHouseDraft?.gems ?? 0);
  let draftIsReroll = $state(!(initHouseDraft?.isFirstDraftAtDoor ?? true));
  let draftPreviousDraft = $state<[string, string, string]>(
    initHouseDraft?.previousDraft ?? ["", "", ""],
  );
  let draftKeyUsed = $state<"" | "silver" | "prism" | "berry picker">(
    initHouseDraft?.keyUsed ?? "",
  );
  let draftSecretPassageColor = $state<"" | PrismColor>(
    initHouseDraft?.secretPassageColor || "",
  );
  let outerRoomDraftCount = $state<number>(
    loaded?.draft && loaded.draft.kind == "outer"
      ? (loaded.draft as OuterDraftParams).outerRoomDraftCount
      : 0,
  );
  let previouslyDraftedOuter = $state<string>(
    loaded?.draft && loaded.draft.kind == "outer"
      ? ((loaded.draft as OuterDraftParams).previouslyDraftedOuter ?? "")
      : "",
  );
  let outerBerryPicker = $state<boolean>(
    loaded?.draft && loaded.draft.kind == "outer"
      ? (loaded.draft as OuterDraftParams).berryPicker
      : false,
  );
  let draftKey = $state(0);

  let gamePanelOpen = $state(loadPanelOpen("game", false));
  let dayPanelOpen = $state(loadPanelOpen("day", false));
  let housePanelOpen = $state(loadPanelOpen("house", false));
  let draftPanelOpen = $state(loadPanelOpen("draft", false));

  let draftParams: DraftParams | undefined = $derived.by(() => {
    if (draftMode === "none") return undefined;
    if (draftMode === "outer")
      return {
        kind: "outer" as const,
        outerRoomDraftCount,
        previouslyDraftedOuter: previouslyDraftedOuter || undefined,
        berryPicker: outerBerryPicker,
      };
    const hasPreviousDraft = draftPreviousDraft.some((s) => s !== "");
    return {
      kind: "house",
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
      keyUsed: draftKeyUsed || undefined,
      secretPassageColor: (draftSecretPassageColor as PrismColor) || undefined,
    };
  });

  // Track previous spoiler settings to detect actual changes (not just initial load)
  let prevSpoilerSettings = $state({ westGate: spoilerSettings.westGate, room46: spoilerSettings.room46 });

  // Sync spoiler milestones → game state only when manually changed
  // (never downgrade on uncheck, and only apply on user interaction, not permalink load or batch updates)
  $effect(() => {
    const { westGate, room46 } = spoilerSettings;

    // Skip if this is a batch update (e.g., from "entire game" checkbox)
    if ((spoilerSettings as any)._batchUpdate) {
      prevSpoilerSettings = { westGate, room46 };
      return;
    }

    // Only apply if these settings actually changed (not just initial render)
    const westGateChanged = westGate !== prevSpoilerSettings.westGate;
    const room46Changed = room46 !== prevSpoilerSettings.room46;

    if (westGateChanged || room46Changed) {
      if (room46 && room46Changed) {
        const cur = untrack(() => gameState);
        if (!cur.haveRoom46) gameState = { ...cur, haveWestGate: true, haveRoom46: true };
      } else if (westGate && westGateChanged) {
        const cur = untrack(() => gameState);
        if (!cur.haveWestGate) gameState = { ...cur, haveWestGate: true };
      }

      prevSpoilerSettings = { westGate, room46 };
    }
  });

  $effect(() => {
    const g = $state.snapshot(gameState) as GameState;
    const d = $state.snapshot(dayState) as DayState;
    const h = $state.snapshot(houseState) as HouseState;
    const p = draftParams;
    const ui = { sortBy, viewMode };
    const timer = setTimeout(() => persistLocally(g, d, h, p, ui), 300);
    return () => clearTimeout(timer);
  });

  async function permalink() {
    saveState(gameState, dayState, houseState, draftParams, {
      sortBy,
      viewMode,
    });
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard API may fail in some contexts (e.g., insecure origins)
    }
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
    draftKeyUsed = "";
    draftSecretPassageColor = "";
    outerRoomDraftCount = 0;
    previouslyDraftedOuter = "";
    outerBerryPicker = false;
    gamePanelOpen = false;
    dayPanelOpen = false;
    housePanelOpen = false;
    draftPanelOpen = false;
    draftKey++;
  }

  function nextDay() {
    // Clear placed rooms (keep entrance-hall and antechamber)
    houseState = {
      ...initHouse(),
      placedRooms: ["entrance-hall", "antechamber"],
    };

    // Clear all daily state except chess
    const preservedChess = {
      knightChess: dayState.knightChess,
      chessColor: dayState.chessColor,
      pawnChessKnight: dayState.pawnChessKnight,
    };
    dayState = {
      ...initDay(dayState.day + 1),
      ...preservedChess,
    };

    // Clear draft state and point to C2/N
    draftMode = "house";
    draftColumn = "C";
    draftRow = 2;
    draftToDirection = "N";
    draftFromRoomSlug = "";
    draftGems = 0;
    draftIsReroll = false;
    draftPreviousDraft = ["", "", ""];
    draftKeyUsed = "";
    draftSecretPassageColor = "";
    outerRoomDraftCount = 0;
    previouslyDraftedOuter = "";
    outerBerryPicker = false;
    draftKey++;
  }

  function randomPreset() {
    // Helper to pick random element from array
    const pick = <T,>(arr: T[]): T =>
      arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const lockedSlugs = new Set([
      ...roomsForPage(7).map((r) => r.slug),
      ...roomsForPage(8).map((r) => r.slug),
    ]);

    // Get rooms by rarity, excluding locked pages 7/8
    const commonRooms = ROOMS.filter(
      (r) =>
        r.baseRarity === 1 &&
        !["entrance-hall", "antechamber"].includes(r.slug) &&
        !lockedSlugs.has(r.slug),
    );
    const standardRooms = ROOMS.filter(
      (r) => r.baseRarity === 2 && !lockedSlugs.has(r.slug),
    );
    const standardNonDeadEnd = standardRooms.filter(
      (r) => !r.tags.includes("dead-end"),
    );

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
    const row = maxRank as TileRow;
    const columnChoices: TileColumn[] =
      row === 1 ? ["A", "B", "D", "E"] : ["A", "B", "C", "D", "E"];
    const column = pick(columnChoices);
    const validDirections = (["N", "E", "W"] as const).filter(
      (d) =>
        !(d === "N" && row === 1) &&
        !(d === "W" && column === "E") &&
        !(d === "E" && column === "A"),
    );
    const direction = pick(validDirections);

    // Set previous draft: standardForDraft + 2 undrafted common rooms
    const undraftedCommon = commonRooms.filter(
      (r) => !selectedCommonSet.has(r.slug),
    );
    const previousDraft: [string, string, string] = [
      standardForDraft,
      pick(undraftedCommon).slug,
      pick(undraftedCommon).slug,
    ];

    // Pick a random day < 30
    const randomDay = randInt(1, 29);

    dayState = initDay(randomDay);

    gameState = {
      ...initGameState(),
      haveWestGate: true,
    };

    houseState = {
      ...initHouse(),
      placedRooms: [
        "entrance-hall",
        "antechamber",
        ...selectedCommon,
        ...selectedStandard,
      ],
      maxRank,
    };

    outerRoomDraftCount = randomDay > 1 ? pick([randomDay, randomDay - 1]) : 0;

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

  const poolSlugs = $derived(new Set(gameState.pool.map((r) => r.slug)));

  type PoolResult = { ok: true; pool: DraftPool; orientations: OrientationResult | undefined } | { ok: false; error: Error };

  let poolResult = $derived.by<PoolResult>(() => {
    try {
      const [pool, orientations] = computePool(gameState, dayState, houseState, draftParams);
      return { ok: true, pool, orientations };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error("[bp-drafter] computePool error:", err);
      return { ok: false, error: err };
    }
  });

  let viewMode: ViewMode = $state(
    (loaded?.ui?.viewMode as ViewMode) ?? "room-pct",
  );
  let sortBy: "rarity" | "room" | "name" | "probability" = $state(
    (loaded?.ui?.sortBy as "rarity" | "room" | "name" | "probability") ??
      "probability",
  );
</script>

<div class="layout">
  <div class="config">
    <GameStatePanel
      bind:gameState
      bind:open={gamePanelOpen}
      bind:spoilerSettings
      day={dayState.day}
    />
    <DayStatePanel bind:dayState bind:open={dayPanelOpen} {spoilerSettings} />
    <HouseStatePanel
      bind:houseState
      bind:open={housePanelOpen}
      {spoilerSettings}
      {poolSlugs}
    />
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
        bind:keyUsed={draftKeyUsed}
        bind:secretPassageColor={draftSecretPassageColor}
        bind:outerRoomDraftCount
        bind:previouslyDraftedOuter
        bind:outerBerryPicker
        bind:open={draftPanelOpen}
        {spoilerSettings}
        day={dayState.day}
        altMode={gameState.vmode || gameState.curseOrDare}
      />
    {/key}
    <div class="bottom-btns">
      <button class="action-btn" onclick={permalink}>🔗</button>
      <div class="spacer"></div>
      <button class="action-btn" onclick={resetAll}>Reset</button>
      <button class="action-btn" onclick={randomPreset}>Randomize</button>
      <button class="action-btn" data-tooltip="Advance day" onclick={nextDay}
        >Advance Day</button
      >
    </div>
  </div>
  <div class="results">
    <div class="view-toggle">
      <button
        class="view-btn"
        class:active={viewMode === "room-pct"}
        onclick={() => (viewMode = "room-pct")}>Room %s</button
      >
      <button
        class="view-btn"
        class:active={viewMode === "room-list"}
        onclick={() => (viewMode = "room-list")}>Room Lists</button
      >
      <button
        class="view-btn"
        class:active={viewMode === "door-pct"}
        onclick={() => (viewMode = "door-pct")}>Door %s</button
      >
    </div>
    {#if !poolResult.ok}
      <div class="pool-error">
        <p class="pool-error-msg">Pool computation failed.</p>
        <p class="pool-error-detail">{poolResult.error.message}</p>
        <button class="pool-error-reset" onclick={resetAll}
          >Reset to defaults</button
        >
      </div>
    {:else if viewMode === "room-pct"}
      <PoolTable
        draftPool={poolResult.pool}
        gameRarityOverrides={gameState.rarityOverrides}
        bind:houseState
        bind:sortBy
        {spoilerSettings}
      />
    {:else if viewMode === "room-list"}
      <RoomListView draftPool={poolResult.pool} {spoilerSettings} />
    {:else}
      <DoorPctView
        orientations={poolResult.orientations}
        {spoilerSettings}
        rarityOverrides={poolResult.pool.rarityOverrides}
        toDirection={draftParams?.kind === "house" ? draftParams.toLocation.toDirection : undefined}
      />
    {/if}
  </div>
</div>

<style>
  .pool-error {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pool-error-msg {
    margin: 0;
    font-weight: 600;
    color: var(--text);
  }

  .pool-error-detail {
    margin: 0;
    font-size: 0.85rem;
    font-family: monospace;
    color: var(--text-muted);
    word-break: break-all;
  }

  .pool-error-reset {
    align-self: flex-start;
    margin-top: 0.25rem;
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .pool-error-reset:hover {
    background: var(--border);
    color: var(--text);
  }

  .layout {
    display: flex;
    flex-direction: row;
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

  .view-toggle {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    margin-bottom: 0.75rem;
  }

  .view-btn {
    padding: 0.25rem 0.65rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .view-btn:hover:not(.active) {
    background: var(--border);
    color: var(--text);
  }

  .view-btn.active {
    background: var(--accent-light);
    color: var(--accent);
    border-color: var(--accent);
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
