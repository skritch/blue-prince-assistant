<script lang="ts">
  import { computePool, initState, initDay, initHouse, type GameState, type DayState, type HouseState } from 'bp-logic';
  import GameStatePanel from './GameStatePanel.svelte';
  import DayStatePanel from './DayStatePanel.svelte';
  import HouseStatePanel from './HouseStatePanel.svelte';
  import PoolTable from './PoolTable.svelte';

  let gameState: GameState = $state(initState());
  let dayState: DayState = $state(initDay(1));
  let houseState: HouseState = $state(initHouse());

  let draftPool = $derived(computePool(gameState, dayState, houseState));
</script>

<div class="config">
  <GameStatePanel {gameState} />
  <DayStatePanel {dayState} />
  <HouseStatePanel {houseState} />
</div>

<PoolTable {draftPool} />

<style>
  .config {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
</style>
