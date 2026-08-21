<script lang="ts">
  import {
    computePool,
    initGameState,
    initDay,
    initHouse,
    type GameState,
    type DayState,
    type HouseState,
  } from "bp-logic";
  import GameStatePanel from "./GameStatePanel.svelte";
  import DayStatePanel from "./DayStatePanel.svelte";
  import HouseStatePanel from "./HouseStatePanel.svelte";
  import PoolTable from "./PoolTable.svelte";

  let gameState: GameState = $state({ ...initGameState() });
  let dayState: DayState = $state(initDay(1));
  let houseState: HouseState = $state(initHouse());

  let draftPool = $derived(computePool(gameState, dayState, houseState));
</script>

<div class="layout">
  <div class="config">
    <GameStatePanel bind:gameState />
    <DayStatePanel bind:dayState />
    <HouseStatePanel bind:houseState />
  </div>
  <div class="results">
    <PoolTable {draftPool} />
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
    flex: 0 0 340px;
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
