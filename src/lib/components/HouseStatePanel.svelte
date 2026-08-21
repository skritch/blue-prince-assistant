<script lang="ts">
  import { untrack } from 'svelte';
  import { type HouseState } from 'bp-logic';

  let { houseState }: { houseState: HouseState } = $props();

  let placedRoomsText = $state(untrack(() => houseState.placedRooms.join('\n')));

  $effect(() => {
    houseState.placedRooms = placedRoomsText.split('\n').map((s) => s.trim()).filter(Boolean);
  });
</script>

<details class="panel" open>
  <summary class="panel-header">House State</summary>
  <div class="fields">
    <label class="inline-field">
      Max Rank
      <input type="number" min="1" bind:value={houseState.maxRank} />
    </label>
    <label class="field-label">
      Placed Rooms <span class="hint">(one slug per line)</span>
      <textarea bind:value={placedRoomsText} rows="6" class="mono"></textarea>
    </label>
  </div>
</details>
