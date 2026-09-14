<script lang="ts">
  import type { Direction, TileColumn, TileRow } from "bp-logic";
  import type { SpoilerSettings } from "../spoilerSettings";
  import { ROOMS } from "bp-logic";
  import { untrack } from "svelte";
  import SearchInput from "./SearchInput.svelte";
  import { loadPanelOpen, savePanelOpen } from "../panelState";

  type Mode = "none" | "outer" | "house";

  type PrismColor = "purple" | "orange" | "green" | "gold" | "red";

  let {
    mode = $bindable(),
    column = $bindable(),
    row = $bindable(),
    toDirection = $bindable(),
    fromRoomSlug = $bindable(),
    gems = $bindable(),
    isReroll = $bindable(),
    previousDraft = $bindable(),
    keyUsed = $bindable(),
    secretPassageColor = $bindable(),
    outerRoomDraftCount = $bindable(),
    previouslyDraftedOuter = $bindable(),
    outerBerryPicker = $bindable(),
    open = $bindable(loadPanelOpen("draft", false)),
    spoilerSettings,
    day,
    altMode,
  }: {
    mode: Mode;
    column: TileColumn;
    row: number;
    toDirection: Direction;
    fromRoomSlug: string;
    gems: number;
    isReroll: boolean;
    previousDraft: [string, string, string];
    keyUsed: "" | "silver" | "prism" | "berry picker";
    secretPassageColor: "" | PrismColor;
    outerRoomDraftCount: number;
    previouslyDraftedOuter: string;
    outerBerryPicker: boolean;
    open: boolean;
    spoilerSettings: SpoilerSettings;
    day: number;
    altMode: boolean;
  } = $props();

  const showOuter = $derived(spoilerSettings.westGate || spoilerSettings.entireGame);
  const showBerryPicker = $derived(spoilerSettings.entireGame);
  const showOuterDraftCount = $derived(
    !(day > 8 || spoilerSettings.room46 || spoilerSettings.entireGame || altMode),
  );

  $effect(() => {
    if (!showOuter && untrack(() => mode) === 'outer') mode = 'none';
  });

  $effect(() => savePanelOpen("draft", open));

  const outerRoomOptions = ROOMS.filter((r) => r.directoryPage === 9)
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

  const invalidDirections = $derived(
    new Set<Direction>([
      ...(row === 1 ? ["N" as Direction] : []),
      ...(row === 9 ? ["S" as Direction] : []),
      ...(column === "A" ? ["E" as Direction] : []),
      ...(column === "E" ? ["W" as Direction] : []),
    ]),
  );

  $effect(() => {
    if (invalidDirections.has(untrack(() => toDirection))) {
      toDirection =
        DIRECTIONS.find((d) => !invalidDirections.has(d.value))?.value ?? "N";
    }
  });

  const showPassageColor = $derived(fromRoomSlug === "secret-passage");
  const showPrismColor = $derived(keyUsed === "prism");

  $effect(() => {
    if (!showPassageColor && !showPrismColor) {
      secretPassageColor = "";
    }
  });

  const panelTitle = $derived(
    mode === "house"
      ? `Drafting: ${toDirection} into ${column}${row}`
      : mode === "outer"
        ? "Drafting: Outer Room"
        : "Draft Location",
  );

  function clearPreviousDraft() {
    previousDraft = ["", "", ""];
    fromRoomSlug = "";
  }
</script>

<details class="panel" bind:open>
  <summary class="panel-header">{panelTitle}</summary>
  <div class="fields">
    <div class="top-grid">
      <div class="mode-col">
        <label><input type="radio" bind:group={mode} value="none" /> None</label>
        {#if showOuter}
          <label><input type="radio" bind:group={mode} value="outer" /> Outer Room</label>
        {/if}
        <label><input type="radio" bind:group={mode} value="house" /> House Tile</label>
      </div>

      {#if mode === "outer"}
        <div class="outer-fields">
          {#if showOuterDraftCount}
            <label
              class="inline-field"
              data-tooltip="Rarer outer rooms appear after the first 3 drafts"
            >
              Times drafted:
              <input
                type="number"
                min="0"
                class="narrow"
                value={outerRoomDraftCount}
                oninput={(e) =>
                  (outerRoomDraftCount = parseInt(e.currentTarget.value) || 0)}
              />
            </label>
          {/if}
          <div
            class="prev-outer-col"
            data-tooltip="The previous outer room drafted will not appear in the initial roll of three"
          >
            <div class="prev-outer-label">Previously drafted:</div>
            <div class="prev-outer-input">
              <SearchInput
                items={outerRoomOptions}
                bind:value={previouslyDraftedOuter}
                placeholder="none"
              />
            </div>
          </div>
          {#if showBerryPicker}
            <label class="checkbox-field">
              <input type="checkbox" bind:checked={outerBerryPicker} />
              Berry Picker
            </label>
          {/if}
        </div>
      {/if}

      {#if mode === "house"}
        <div class="location-col">
          <select bind:value={toDirection}>
            {#each DIRECTIONS as d}
              <option value={d.value} disabled={invalidDirections.has(d.value)}
                >{d.label}</option
              >
            {/each}
          </select>
          <div class="into-label">into</div>
          <div class="tile-selects">
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
        </div>
      {/if}
    </div>

    {#if mode === "house"}
      <div class="divider"></div>
      <div class="house-grid">
        <label class="inline-field">
          Gems:
          <input type="number" min="0" bind:value={gems} />
        </label>
        {#if showOuter}
          <label class="inline-field inline-field-end">
            Keys,&nbsp;etc.:
            <select bind:value={keyUsed} class="key-select">
              <option value="">None</option>
              <option value="silver">Silver Key</option>
              <option value="prism">Prism Key</option>
              {#if showBerryPicker}
                <option value="berry picker">Blessing of the Berry Picker</option>
              {/if}
            </select>
          </label>
        {/if}

        <label
          class="checkbox-field"
          data-tooltip="When rerolling, all three rooms from the previous draft are always filtered out, as opposed to the first draft at a door when they only have a chance of being removed."
        >
          Reroll:
          <input type="checkbox" bind:checked={isReroll} />
        </label>
        {#if showPassageColor || showPrismColor}
          <label class="inline-field inline-field-end">
            Color:
            <select bind:value={secretPassageColor} class="color-select">
              <option value="">—</option>
              <option value="purple">Purple</option>
              <option value="orange">Orange</option>
              <option value="green">Green</option>
              <option value="gold">Gold</option>
              <option value="red">Red</option>
            </select>
          </label>
        {/if}

        <div class="col-span-divider"></div>

        <div class="prev-draft">
          <div class="prev-draft-header">
            <div class="section-label">Previous draft:</div>
            <button class="clear-btn" onclick={clearPreviousDraft}
              >(clear)</button
            >
          </div>
          <div class="prev-input">
            <SearchInput
              items={roomOptions}
              bind:value={previousDraft[0]}
              placeholder="slot 1"
            />
          </div>
          <div class="prev-input">
            <SearchInput
              items={roomOptions}
              bind:value={previousDraft[1]}
              placeholder="slot 2"
            />
          </div>
          <div class="prev-input">
            <SearchInput
              items={roomOptions}
              bind:value={previousDraft[2]}
              placeholder="slot 3"
            />
          </div>
        </div>
        <div class="from-col">
          <div class="section-label">Drafting from:</div>
          <div class="from-room-input">
            <SearchInput
              items={roomOptions}
              bind:value={fromRoomSlug}
              placeholder="room"
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
</details>

<style>
  .top-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: start;
  }

  .mode-col {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.875rem;
  }

  .mode-col label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .location-col {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.875rem;
    align-items: center;
    justify-content: center;
  }

  .into-label {
    font-size: 0.875rem;
    color: var(--text);
  }

  .tile-selects {
    display: flex;
    gap: 0.3rem;
  }

  .tile-selects select {
    width: 3.5rem;
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 0.25rem 0;
  }

  .house-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem 1rem;
    align-items: center;
  }

  .prev-draft,
  .from-col {
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 0.15rem;
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
    width: 100%;
    min-width: 0;
  }

  .outer-fields .inline-field {
    width: 100%;
    min-width: 0;
  }

  .prev-outer-col {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    width: 100%;
    min-width: 0;
  }

  .prev-outer-label {
    font-size: 0.875rem;
    color: var(--text);
  }

  .prev-outer-input {
    width: 100%;
    min-width: 0;
  }

  .prev-outer-input :global(.text-input) {
    font-size: 0.7rem;
  }

  .inline-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .inline-field-end {
    justify-content: flex-end;
  }

  .narrow {
    width: 4rem;
  }

  .key-select,
  .color-select {
    font-size: 0.8rem;
  }

  .col-span-divider {
    grid-column: 1 / -1;
    height: 1px;
    background: var(--border);
    margin: 0.25rem 0;
  }

  .prev-draft-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .prev-draft-header .section-label {
    margin-bottom: 0.15rem;
  }

  .clear-btn {
    padding: 0;
    font-size: 0.75rem;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .clear-btn:hover {
    color: var(--text);
  }
</style>
