<script lang="ts">
  import { computeOdds } from '../engine/draft'
  import type { RunState } from '../types'

  let state: RunState = {
    day: 1,
    placedRooms: new Set(),
    activeBuffs: new Set(),
  }

  $: odds = computeOdds(state)
  $: poolOdds = odds.filter((o) => o.inPool).sort((a, b) => b.probability - a.probability)
</script>

<section class="controls">
  <label>
    Day
    <input type="number" min="1" bind:value={state.day} />
  </label>
</section>

<section class="pool">
  <h2>Draft Pool ({poolOdds.length} rooms)</h2>
  {#if poolOdds.length === 0}
    <p class="empty">No rooms in pool. Add room data to get started.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Room</th>
          <th>Rarity</th>
          <th>Gems</th>
          <th>Draft %</th>
        </tr>
      </thead>
      <tbody>
        {#each poolOdds as { room, probability }}
          <tr>
            <td>{room.name}</td>
            <td class="rarity {room.rarity}">{room.rarity}</td>
            <td>{room.gemCost}</td>
            <td>{(probability * 100).toFixed(1)}%</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  .controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  input[type='number'] {
    width: 5rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--text);
  }
  h2 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }
  .empty {
    color: var(--text-muted);
    font-style: italic;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th {
    text-align: left;
    padding: 0.4rem 0.75rem;
    border-bottom: 2px solid var(--border);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  td {
    padding: 0.4rem 0.75rem;
    border-bottom: 1px solid var(--border);
  }
  .rarity.common { color: #6b7280; }
  .rarity.uncommon { color: #2563eb; }
  .rarity.rare { color: #7c3aed; }
</style>
