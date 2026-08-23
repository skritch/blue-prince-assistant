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
  import GameStatePanel from "./GameStatePanel.svelte";
  import DayStatePanel from "./DayStatePanel.svelte";
  import HouseStatePanel from "./HouseStatePanel.svelte";
  import DraftStatePanel from "./DraftStatePanel.svelte";
  import PoolTable from "./PoolTable.svelte";

  let gameState: GameState = $state({ ...initGameState() });
  let dayState: DayState = $state(initDay(1));
  let houseState: HouseState = $state(initHouse());
  let draftParams: DraftParams | undefined = $state(undefined);
  let draftKey = $state(0);

  function resetAll() {
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
      <DraftStatePanel bind:draftParams />
    {/key}
    <button class="reset-btn" onclick={resetAll}>Reset all</button>
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

  .reset-btn {
    margin-top: 0.25rem;
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    align-self: flex-start;
  }

  .reset-btn:hover {
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
