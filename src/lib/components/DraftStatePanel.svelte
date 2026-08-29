<script lang="ts">
  import type { Direction, TileColumn, TileRow } from "bp-logic";
  import { ROOMS } from "bp-logic";
  import { untrack } from "svelte";
  import SearchInput from "./SearchInput.svelte";
  import { loadPanelOpen, savePanelOpen } from "../panelState";

  type Mode = "none" | "outer" | "house";

  let {
    mode = $bindable(),
    column = $bindable(),
    row = $bindable(),
    toDirection = $bindable(),
    fromRoomSlug = $bindable(),
    gems = $bindable(),
    isReroll = $bindable(),
    previousDraft = $bindable(),
    outerRoomDraftCount = $bindable(),
    previouslyDraftedOuter = $bindable(),
    open = $bindable(loadPanelOpen("draft", false)),
  }: {
    mode: Mode;
    column: TileColumn;
    row: number;
    toDirection: Direction;
    fromRoomSlug: string;
    gems: number;
    isReroll: boolean;
    previousDraft: [string, string, string];
    outerRoomDraftCount: number;
    previouslyDraftedOuter: string;
    open: boolean;
  } = $props();

  $effect(() => savePanelOpen("draft", open));

  const outerRoomOptions = ROOMS
    .filter((r) => r.directoryPage === 9)
    .map((r) => ({ id: r.slug, label: r.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const COLUMNS: TileColumn[] = ["A", "B", "C", "D", "E"];
  const ROWS: TileRow[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const DIRECTIONS: { value: Direction; label: string }[] = [
    { value: "N", label: "North" },
    { value: "S", label: "South" },
    { value: "E", label: "East" },
    { value: "W", label: "West" },
  ];

  const roomOptions = ROOMS.map((r) => ({ id: r.slug, label: r.name })).sort(
    (a, b) => a.label.localeCompare(b.label),
  );

  const invalidDirections = $derived(new Set<Direction>([
    ...(row === 1 ? ['N' as Direction] : []),
    ...(row === 9 ? ['S' as Direction] : []),
    ...(column === 'A' ? ['E' as Direction] : []),
    ...(column === 'E' ? ['W' as Direction] : []),
  ]));

  $effect(() => {
    if (invalidDirections.has(untrack(() => toDirection))) {
      toDirection = DIRECTIONS.find((d) => !invalidDirections.has(d.value))?.value ?? 'N';
    }
  });
</script>

<details class="panel" bind:open>
  <summary class="panel-header">Draft</summary>
  <div class="fields">
    <div class="mode-row">
      <label><input type="radio" bind:group={mode} value="none" /> None</label>
      <label
        ><input type="radio" bind:group={mode} value="outer" /> Outer</label
      >
      <label
        ><input type="radio" bind:group={mode} value="house" /> House</label
      >
    </div>

    {#if mode === "outer"}
      <div class="outer-fields">
        <label class="inline-field">
          Times drafted:
          <input
            type="number"
            min="0"
            class="narrow"
            value={outerRoomDraftCount}
            oninput={(e) => (outerRoomDraftCount = parseInt(e.currentTarget.value) || 0)}
          />
        </label>
        <div class="inline-field">
          Previously drafted:
          <div class="prev-outer-input">
            <SearchInput
              items={outerRoomOptions}
              bind:value={previouslyDraftedOuter}
              placeholder="none"
            />
          </div>
        </div>
      </div>
    {/if}

    {#if mode === "house"}
      <div class="inline-field">
        <select bind:value={toDirection}>
          {#each DIRECTIONS as d}
            <option value={d.value} disabled={invalidDirections.has(d.value)}>{d.label}</option>
          {/each}
        </select>
        into
        <select bind:value={column}>
          {#each COLUMNS as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
        <select
          value={row}
          onchange={(e) => (row = parseInt(e.currentTarget.value))}
        >
          {#each ROWS as r}
            <option value={r}>{r}</option>
          {/each}
        </select>
      </div>

      <div class="draft-cols">
        <div class="draft-col">
          <div class="section-label">Previous draft:</div>
          <div class="prev-input"><SearchInput items={roomOptions} bind:value={previousDraft[0]} placeholder="slot 1" /></div>
          <div class="prev-input"><SearchInput items={roomOptions} bind:value={previousDraft[1]} placeholder="slot 2" /></div>
          <div class="prev-input"><SearchInput items={roomOptions} bind:value={previousDraft[2]} placeholder="slot 3" /></div>

          <label class="checkbox-field" data-tooltip="When rerolling, all three rooms from the previous draft are always filtered out. On the first draft at a door, they only have a chance of being removed.">
            <input type="checkbox" bind:checked={isReroll} />
            Is reroll
          </label>

          <label class="inline-field">
            Gems:
            <input type="number" min="0" bind:value={gems} />
          </label>
        </div>

        <div class="draft-col">
          <div class="section-label">Drafting from:</div>
          <div class="from-room-input"><SearchInput items={roomOptions} bind:value={fromRoomSlug} placeholder="room" /></div>
        </div>
      </div>
    {/if}
  </div>
</details>

<style>
  .mode-row {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
  }

  .mode-row label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .draft-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: start;
  }

  .draft-col {
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
    margin-bottom: 0.15rem;
  }

  .prev-input {
    width: 100%;
    min-width: 0;
  }

  .prev-input :global(.text-input),
  .from-room-input :global(.text-input) {
    font-size: 0.7rem;
  }

  .from-room-input {
    width: 100%;
    min-width: 0;
  }

  .checkbox-field {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .outer-fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .inline-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .narrow {
    width: 4rem;
  }

  .prev-outer-input {
    flex: 1;
    min-width: 0;
  }

  .prev-outer-input :global(.text-input) {
    font-size: 0.7rem;
  }
</style>
