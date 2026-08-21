<script lang="ts">
  import { addRoom, removeRoom, type GameState } from "bp-logic";

  let { gameState }: { gameState: GameState } = $props();

  let comAdditionsText = $state("");

  $effect(() => {
    gameState.chamberOfMirrorsAdditions = comAdditionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  });

  const PAGE7_ROOMS = [
    { slug: "classroom", name: "Classroom" },
    { slug: "dovecote", name: "Dovecote" },
    { slug: "kennel", name: "Kennel" },
    { slug: "clock-tower", name: "Clock Tower" },
    { slug: "dormitory", name: "Dormitory" },
    { slug: "vestibule", name: "Vestibule" },
    { slug: "casino", name: "Casino" },
    { slug: "solarium", name: "Solarium" },
  ];

  const PAGE8_ROOMS = [
    { slug: "planetarium", name: "Planetarium" },
    { slug: "tunnel", name: "Tunnel" },
    { slug: "conservatory", name: "Conservatory" },
    { slug: "closed-exhibit", name: "Closed Exhibit" },
    { slug: "mechanarium", name: "Mechanarium" },
    { slug: "treasure-trove", name: "Treasure Trove" },
    { slug: "throne-room", name: "Throne Room" },
    { slug: "lost-and-found", name: "Lost And Found" },
  ];

  function hasRoom(slug: string): boolean {
    return gameState.pool.some((r) => r.slug === slug);
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
      gameState.haveDraftedFoundation &&
      ALL_FLOORPLAN_ROOMS.every((r) => hasRoom(r.slug)),
  );

  function toggleFullHouse() {
    if (fullHouseActive) {
      gameState.haveWestGate = false;
      gameState.haveRoom46 = false;
      gameState.haveDraftedFoundation = false;
      for (const room of ALL_FLOORPLAN_ROOMS) {
        gameState.pool = removeRoom(gameState, room.slug).pool;
      }
    } else {
      gameState.haveWestGate = true;
      gameState.haveRoom46 = true;
      gameState.haveDraftedFoundation = true;
      for (const room of ALL_FLOORPLAN_ROOMS) {
        gameState.pool = addRoom(gameState, room.slug).pool;
      }
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
          ><input
            type="checkbox"
            bind:checked={gameState.haveDraftedFoundation}
          /> Drafted Foundation</label
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
        <input type="checkbox" bind:checked={gameState.vmode} />
        Veteran Mode<a
          href="https://blueprince.wiki.gg/wiki/Spoilers:Veteran_Mode"
          target="_blank"
          rel="noopener"
          class="wiki-link">↗</a
        >
      </label>
      <label
        ><input type="checkbox" bind:checked={gameState.curseOrDare} /> Curse / Dare</label
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
