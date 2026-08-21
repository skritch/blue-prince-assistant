<script lang="ts">
  import { untrack } from "svelte";
  import {
    addRoom,
    removeRoom,
    initGameFull,
    roomsForPage,
    type GameState,
    initGameState,
  } from "bp-logic";

  let { gameState = $bindable() }: { gameState: GameState } = $props();

  let comAdditionsText = $state("");

  $effect(() => {
    const chamberOfMirrorsAdditions = comAdditionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    gameState = { ...untrack(() => gameState), chamberOfMirrorsAdditions };
  });

  const PAGE7_ROOMS = roomsForPage(7);
  const PAGE8_ROOMS = roomsForPage(8);

  function hasRoom(slug: string): boolean {
    return gameState.pool.some((r) => r.slug === slug);
  }

  function setFlag(key: keyof GameState, value: boolean) {
    gameState = { ...gameState, [key]: value };
  }

  function toggleRoom(slug: string, add: boolean) {
    if (add) {
      gameState.pool = addRoom(gameState, slug).pool;
    } else {
      gameState.pool = removeRoom(gameState, slug).pool;
    }
  }

  const ALL_FLOORPLAN_ROOMS = [...PAGE7_ROOMS, ...PAGE8_ROOMS];

  let fullHouseActive = $derived(
    gameState.haveWestGate &&
      gameState.haveRoom46 &&
      ALL_FLOORPLAN_ROOMS.every((r) => hasRoom(r.slug)),
  );

  function toggleFullHouse() {
    if (fullHouseActive) {
      gameState = initGameState();
    } else {
      gameState = initGameFull();
    }
  }
</script>

<details class="panel" open>
  <summary class="panel-header">Game State</summary>
  <div class="fields">
    <div class="section">
      <div class="section-label">Unlocks</div>
      <div class="two-col">
        <label
          ><input type="checkbox" bind:checked={gameState.haveWestGate} /> West Gate</label
        >
        <label
          ><input type="checkbox" bind:checked={gameState.haveRoom46} /> Room 46</label
        >
      </div>
    </div>

    <div class="section">
      <div class="floorplan-cols">
        <div>
          <div class="section-label">Studio Additions</div>
          <div class="checkboxes col">
            {#each PAGE7_ROOMS as room}
              <label>
                <input
                  type="checkbox"
                  checked={hasRoom(room.slug)}
                  onchange={(e) =>
                    toggleRoom(room.slug, e.currentTarget.checked)}
                />
                {room.name}
              </label>
            {/each}
          </div>
        </div>
        <div>
          <div class="section-label">Found Floorplans</div>
          <div class="checkboxes col">
            {#each PAGE8_ROOMS as room}
              <label>
                <input
                  type="checkbox"
                  checked={hasRoom(room.slug)}
                  onchange={(e) =>
                    toggleRoom(room.slug, e.currentTarget.checked)}
                />
                {room.name}
              </label>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <div class="inline-fields">
      <button
        class="btn"
        class:active={fullHouseActive}
        onclick={toggleFullHouse}>Select All</button
      >
    </div>

    <div class="two-col">
      <label>
        <input
          type="checkbox"
          checked={gameState.vmode}
          onchange={(e) => setFlag("vmode", e.currentTarget.checked)}
        />
        Veteran Mode<a
          href="https://blueprince.wiki.gg/wiki/Spoilers:Veteran_Mode"
          target="_blank"
          rel="noopener"
          class="wiki-link">↗</a
        >
      </label>
      <label
        ><input
          type="checkbox"
          checked={gameState.curseOrDare}
          onchange={(e) => setFlag("curseOrDare", e.currentTarget.checked)}
        /> Curse / Dare</label
      >
    </div>

    <details class="subsection">
      <summary class="subsection-header">Chamber of Mirrors additions</summary>
      <div class="subsection-body">
        <span class="hint">one slug per line</span>
        <textarea bind:value={comAdditionsText} rows="3" class="mono"
        ></textarea>
      </div>
    </details>
  </div>
</details>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .section-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  .two-col label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .floorplan-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .checkboxes.col {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .btn {
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--accent-light);
    color: var(--text);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn:hover {
    border-color: var(--accent);
  }

  .btn.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .btn.active:hover {
    opacity: 0.85;
  }

  .wiki-link {
    color: var(--accent);
    text-decoration: none;
    font-size: 0.65rem;
    vertical-align: super;
    line-height: 0;
  }

  .wiki-link:hover {
    text-decoration: underline;
  }

  .subsection {
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  .subsection-header {
    padding: 0.35rem 0.6rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
    list-style: none;
  }

  .subsection-header::before {
    content: "▶";
    display: inline-block;
    margin-right: 0.4rem;
    font-size: 0.6rem;
    transition: transform 0.15s;
  }

  details[open] .subsection-header::before {
    transform: rotate(90deg);
  }

  .subsection-body {
    padding: 0.5rem 0.6rem;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
</style>
