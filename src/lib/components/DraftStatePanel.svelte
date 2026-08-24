<script lang="ts">
  import type { DraftParams, Direction, TileColumn, TileRow } from "bp-logic";
  import { ROOMS } from "bp-logic";
  import SearchInput from "./SearchInput.svelte";
  import { loadPanelOpen, savePanelOpen } from "../panelState";

  let {
    draftParams = $bindable(),
    initialDraft,
  }: {
    draftParams: DraftParams | undefined;
    initialDraft?: DraftParams;
  } = $props();

  type Mode = "none" | "outer" | "house";

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

  const initHouse =
    initialDraft && initialDraft !== "outer" ? initialDraft : undefined;

  let mode: Mode = $state(
    !initialDraft ? "none" : initialDraft === "outer" ? "outer" : "house",
  );
  let column: TileColumn = $state(initHouse?.toLocation.tile.column ?? "C");
  let row = $state<number>(initHouse?.toLocation.tile.row ?? 5);
  let toDirection: Direction = $state(
    initHouse?.toLocation.toDirection ?? "N",
  );
  let fromRoomSlug = $state(initHouse?.fromRoomSlug ?? "");
  let gems = $state(initHouse?.gems ?? 0);
  let isFirstDraftAtDoor = $state(initHouse?.isFirstDraftAtDoor ?? false);

  const roomOptions = ROOMS.map((r) => ({ id: r.slug, label: r.name })).sort(
    (a, b) => a.label.localeCompare(b.label),
  );

  $effect(() => {
    if (mode === "none") {
      draftParams = undefined;
    } else if (mode === "outer") {
      draftParams = "outer";
    } else {
      draftParams = {
        toLocation: {
          tile: { column, row: row as TileRow },
          toDirection,
        },
        fromRoomSlug: fromRoomSlug || undefined,
        gems,
        isFirstDraftAtDoor,
      };
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

      <div class="inline-fields">
        <label class="inline-field">
          From:
          <SearchInput items={roomOptions} bind:value={fromRoomSlug} placeholder="room..." />
        </label>
        <label class="inline-field">
          Gems:
          <input type="number" min="0" bind:value={gems} />
        </label>
        <label class="inline-field">
          <input type="checkbox" bind:checked={isFirstDraftAtDoor} />
          First draft at door
        </label>
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
</style>
