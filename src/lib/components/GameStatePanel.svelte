<script lang="ts">
  import {
    addRoom,
    removeRoom,
    initGameFull,
    roomsForPage,
    ROOMS,
    UPGRADES,
    MIRROR_FLOORPLANS,
    UNDRAFTABLE,
    type GameState,
    type Rarity,
    initGameState,
  } from "bp-logic";
  import SearchPairInput from "./SearchPairInput.svelte";
  import type { Item, Entry } from "./searchPairTypes";
  import { loadPanelOpen, savePanelOpen } from "../panelState";

  let { gameState = $bindable() }: { gameState: GameState } = $props();

  let open = $state(loadPanelOpen("game", false));
  $effect(() => savePanelOpen("game", open));

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

  // Must match the toSlug in pool.ts
  function toSlug(str: string): string {
    return str
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const ROOM_NAME_BY_SLUG = Object.fromEntries(
    ROOMS.map((r) => [r.slug, r.name]),
  );

  // --- Room Upgrades ---
  type UpgradesShape = Record<
    string,
    { upgrades: Array<{ name?: string; description?: string }> }
  >;

  const upgradeSearchItems: Item[] = Object.keys(UPGRADES as UpgradesShape)
    .map((slug) => ({ id: slug, label: ROOM_NAME_BY_SLUG[slug] ?? slug }))
    .sort((a, b) => a.label.localeCompare(b.label));

  function upgradeOptions(baseSlug: string): Item[] {
    const entry = (UPGRADES as UpgradesShape)[baseSlug];
    return (entry?.upgrades ?? [])
      .filter((u) => u.name || u.description)
      .map((u) => ({
        id: toSlug(u.name ?? u.description!),
        label: u.name ?? u.description!,
      }));
  }

  let upgradeEntries: Entry[] = $derived(
    Object.entries(gameState.upgrades).map(([slug, upgradeSlug]) => ({
      keyId: slug,
      keyLabel: ROOM_NAME_BY_SLUG[slug] ?? slug,
      valueId: upgradeSlug,
      valueLabel:
        upgradeOptions(slug).find((o) => o.id === upgradeSlug)?.label ??
        upgradeSlug,
    })),
  );

  function addUpgrade(slug: string, upgradeSlug?: string) {
    if (!upgradeSlug) return;
    gameState = {
      ...gameState,
      upgrades: { ...gameState.upgrades, [slug]: upgradeSlug },
    };
  }

  function removeUpgrade(i: number) {
    const next = { ...gameState.upgrades };
    delete next[Object.keys(next)[i]];
    gameState = { ...gameState, upgrades: next };
  }

  // --- Rarity Overrides ---
  const undraftableSet = new Set(UNDRAFTABLE);
  const raritySearchItems: Item[] = ROOMS.filter(
    (r) => !undraftableSet.has(r.slug),
  )
    .map((r) => ({ id: r.slug, label: r.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const RARITY_OPTIONS: Item[] = [
    { id: "1", label: "Commonplace" },
    { id: "2", label: "Standard" },
    { id: "3", label: "Unusual" },
    { id: "4", label: "Rare" },
  ];

  let rarityEntries: Entry[] = $derived(
    Object.entries(gameState.rarityOverrides).map(([slug, rarity]) => ({
      keyId: slug,
      keyLabel: ROOM_NAME_BY_SLUG[slug] ?? slug,
      valueId: String(rarity),
      valueLabel:
        RARITY_OPTIONS.find((r) => r.id === String(rarity))?.label ??
        String(rarity),
    })),
  );

  function addRarity(slug: string, rarityId?: string) {
    if (!rarityId) return;
    const rarity: Rarity =
      Number(rarityId) as Rarity;
    gameState = {
      ...gameState,
      rarityOverrides: { ...gameState.rarityOverrides, [slug]: rarity },
    };
  }

  function removeRarity(i: number) {
    const next = { ...gameState.rarityOverrides };
    delete next[Object.keys(next)[i]];
    gameState = { ...gameState, rarityOverrides: next };
  }

  // --- Chamber of Mirrors Additions ---
  const comSearchItems: Item[] = MIRROR_FLOORPLANS.map((name) => ({
    id: toSlug(name),
    label: name,
  }));

  let comEntries: Entry[] = $derived(
    gameState.chamberOfMirrorsAdditions.map((slug) => ({
      keyId: slug,
      keyLabel: ROOM_NAME_BY_SLUG[slug] ?? slug,
    })),
  );

  function addComRoom(slug: string) {
    gameState = {
      ...gameState,
      chamberOfMirrorsAdditions: [...gameState.chamberOfMirrorsAdditions, slug],
    };
  }

  function removeComRoom(i: number) {
    const arr = [...gameState.chamberOfMirrorsAdditions];
    arr.splice(i, 1);
    gameState = { ...gameState, chamberOfMirrorsAdditions: arr };
  }
</script>

<details class="panel" bind:open>
  <summary class="panel-header">Game</summary>
  <div class="fields">
    <div class="section">
      <div class="section-label">Unlocks</div>
      <div class="two-col">
        <label
          data-tooltip="If west gate has not been accessed, Utility Closet becomes commonplace after day 2"
          ><input type="checkbox" bind:checked={gameState.haveWestGate} /> West Gate</label
        >
        <label
          data-tooltip="Adds Gallery, Trophy Room, and Mount Holly Gift Shop; affects various rarities"
          ><input type="checkbox" bind:checked={gameState.haveRoom46} /> Room 46</label
        >
        <label data-tooltip="Adds Trophy Room"
          ><input type="checkbox" bind:checked={gameState.haveTrophy} /> Trophy Acquired</label
        >
        <label
          data-tooltip="One of several ways to unlock Her Ladyship's Chamber"
          ><input type="checkbox" bind:checked={gameState.foundEpsenTomb} /> Epsen
          Tomb Found</label
        >
        <label
          data-tooltip="After 3+ outer room drafts, the Tomb is no longer biased to the back of the outer room list"
          ><input type="checkbox" bind:checked={gameState.haveFoundationElevator} /> Foundation Elevator</label
        >
        <label
          data-tooltip="Chance of drawing Bookshop from Library decreases with each book bought. Realm &amp; Rune does not count."
          class="inline-field"
        >Books Bought: <input type="number" min="0" bind:value={gameState.booksPurchased} /></label
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
        onclick={toggleFullHouse}>Use Full Directory</button
      >
    </div>

    <div class="two-col">
      <label
        data-tooltip="Modifies many room rarities. Activated by drafting 3 rooms in 45 seconds."
      >
        <input
          type="checkbox"
          checked={gameState.vmode}
          onchange={(e) => setFlag("vmode", e.currentTarget.checked)}
        />
        Veteran Mode
      </label>
      <label
        ><input
          type="checkbox"
          checked={gameState.curseOrDare}
          onchange={(e) => setFlag("curseOrDare", e.currentTarget.checked)}
        /> Curse / Dare Mode</label
      >
    </div>

    <SearchPairInput
      label="Upgraded Rooms"
      searchItems={upgradeSearchItems}
      secondOptions={upgradeOptions}
      entries={upgradeEntries}
      onadd={addUpgrade}
      onremove={removeUpgrade}
    />
    <SearchPairInput
      label="Rarity Overrides"
      searchItems={raritySearchItems}
      secondOptions={() => RARITY_OPTIONS}
      entries={rarityEntries}
      onadd={addRarity}
      onremove={removeRarity}
    />
    <SearchPairInput
      label="Chamber of Mirrors Additions"
      searchItems={comSearchItems}
      entries={comEntries}
      onadd={addComRoom}
      onremove={removeComRoom}
    />
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

  .floorplan-cols > div {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
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
</style>
