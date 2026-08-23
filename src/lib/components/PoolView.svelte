<script lang="ts">
  import {
    computePool,
    initGameState,
    initDay,
    initHouse,
    type GameState,
    type DayState,
    type HouseState,
    type DraftParams,
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
      <button class="action-btn" onclick={permalink}>Permalink</button>
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
    gap: 0.5rem;
    margin-top: 0.25rem;
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
