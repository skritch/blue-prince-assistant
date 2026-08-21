<script lang="ts">
  import { initState, initWithFullPool, type GameState } from 'bp-logic';

  let { gameState }: { gameState: GameState } = $props();

  let fullPool = $state(false);
  let comAdditionsText = $state('');

  $effect(() => {
    gameState.chamberOfMirrorsAdditions = comAdditionsText.split('\n').map((s) => s.trim()).filter(Boolean);
  });

  function applyPreset(useFullPool: boolean) {
    const preset = useFullPool ? initWithFullPool() : initState();
    gameState.pool = preset.pool;
    gameState.haveWestGate = preset.haveWestGate;
    gameState.haveRoom46 = preset.haveRoom46;
    gameState.haveDraftedFoundation = preset.haveDraftedFoundation;
    gameState.vmode = preset.vmode;
    gameState.curseOrDare = preset.curseOrDare;
  }
</script>

<details class="panel" open>
  <summary class="panel-header">Game State</summary>
  <div class="fields">
    <div class="inline-fields">
      <label>
        <input
          type="checkbox"
          checked={fullPool}
          onchange={(e) => { fullPool = e.currentTarget.checked; applyPreset(fullPool); }}
        />
        Full Pool (pages 7–9)
      </label>
      <span class="hint">{gameState.pool.length} rooms in pool</span>
    </div>
    <div class="checkboxes">
      <label><input type="checkbox" bind:checked={gameState.haveWestGate} /> Have West Gate</label>
      <label><input type="checkbox" bind:checked={gameState.haveRoom46} /> Have Room 46</label>
      <label><input type="checkbox" bind:checked={gameState.haveDraftedFoundation} /> Drafted Foundation</label>
      <label><input type="checkbox" bind:checked={gameState.vmode} /> V-Mode</label>
      <label><input type="checkbox" bind:checked={gameState.curseOrDare} /> Curse or Dare</label>
    </div>
    <label class="field-label">
      Chamber of Mirrors additions <span class="hint">(one slug per line)</span>
      <textarea bind:value={comAdditionsText} rows="3" class="mono"></textarea>
    </label>
  </div>
</details>
