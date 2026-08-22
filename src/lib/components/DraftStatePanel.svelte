<script lang="ts">
  import type { DraftParams, Direction, TileColumn, TileRow } from "bp-logic";
  import { ROOMS } from "bp-logic";
  import SearchInput from "./SearchInput.svelte";

  let { draftParams = $bindable() }: { draftParams: DraftParams | undefined } =
    $props();

  type Mode = "none" | "outer" | "house";
  let mode: Mode = $state("none");

  const COLUMNS: TileColumn[] = ["A", "B", "C", "D", "E"];
  const ROWS: TileRow[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const DIRECTIONS: { value: Direction; label: string }[] = [
    { value: "N", label: "North" },
    { value: "S", label: "South" },
    { value: "E", label: "East" },
    { value: "W", label: "West" },
  ];

  let column: TileColumn = $state("C");
  let row = $state<number>(5);
  let toDirection: Direction = $state("N");
  let fromRoomSlug = $state("");
  let gems = $state(0);

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
      };
    }
  });
</script>

<details class="panel" open>
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
