<script lang="ts">
  import type { Direction, TileColumn, TileRow } from "bp-logic";
  import { ROOMS } from "bp-logic";
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
  }: {
    mode: Mode;
    column: TileColumn;
    row: number;
    toDirection: Direction;
    fromRoomSlug: string;
    gems: number;
    isReroll: boolean;
    previousDraft: [string, string, string];
  } = $props();

  const COLUMNS: TileColumn[] = ["A", "B", "C", "D", "E"];
  const ROWS: TileRow[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const DIRECTIONS: { value: Direction; label: string }[] = [
    { value: "N", label: "North" },
    { value: "S", label: "South" },
    { value: "E", label: "East" },
    { value: "W", label: "West" },
  ];

  let open = $state(loadPanelOpen("draft", true));
  $effect(() => savePanelOpen("draft", open));

  const roomOptions = ROOMS.map((r) => ({ id: r.slug, label: r.name })).sort(
    (a, b) => a.label.localeCompare(b.label),
  );
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

    {#if mode === "house"}
      <div class="inline-field">
        <select bind:value={toDirection}>
          {#each DIRECTIONS as d}
            <option value={d.value}>{d.label}</option>
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

          <label class="checkbox-field">
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
</style>
