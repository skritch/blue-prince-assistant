<script lang="ts">
  import {
    type DraftPool,
    type HouseState,
    type Rarity,
    type Annotation,
  } from "bp-logic";

  let {
    draftPool,
    gameRarityOverrides,
    houseState = $bindable(),
  }: {
    draftPool: DraftPool;
    gameRarityOverrides: Record<string, Rarity>;
    houseState: HouseState;
  } = $props();

  function addRoomToHouse(slug: string) {
    houseState = {
      ...houseState,
      placedRooms: [...houseState.placedRooms, slug],
    };
  }

  function removeRoomFromHouse(slug: string) {
    const idx = houseState.placedRooms.lastIndexOf(slug);
    if (idx === -1) return;
    const arr = [...houseState.placedRooms];
    arr.splice(idx, 1);
    houseState = { ...houseState, placedRooms: arr };
  }

  function raritySort(r: Rarity): number {
    return r === null ? 5 : r;
  }

  const RARITY_NAMES: Record<number, string> = {
    1: "commonplace",
    2: "standard",
    3: "unusual",
    4: "rare",
  };
  function rarityName(r: Rarity): string {
    return r === null ? "special" : (RARITY_NAMES[r] ?? "?");
  }

  const SOURCE_LABELS: Record<string, string> = {
    room46: "room 46",
    "pool-in-house": "pool",
    "bacon-and-eggs": "bacon & eggs",
    "knight-chess": "mantle of the knight",
    schoolhouse: "schoolhouse",
    laboratory: "laboratory",
    "com-permanent": "CoM addition",
    "com-passive": "CoM copy",
  };

  function formatAnnotations(annotations: Annotation[]): string {
    return annotations
      .map((a) => {
        if ("pct" in a) return `${a.pct}% chance in pool`;
        if ("mirrorNote" in a) return a.mirrorNote;
        if ("rarityNote" in a) return a.rarityNote;
        if ("blockNote" in a) return a.blockNote;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  let sortedRooms = $derived(
    [...draftPool.rooms].sort((a, b) => {
      const ra = raritySort(
        draftPool.rarityOverrides[a.room.slug] ?? a.room.baseRarity,
      );
      const rb = raritySort(
        draftPool.rarityOverrides[b.room.slug] ?? b.room.baseRarity,
      );
      return ra !== rb ? ra - rb : a.room.name.localeCompare(b.room.name);
    }),
  );
</script>

<section>
  <h2>Draft Pool ({draftPool.rooms.length} rooms)</h2>
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Room</th>
        <th>Rarity</th>
        <th>Doors</th>
        <th>Tags</th>
        <th>Source</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each sortedRooms as { room, source, upgrade }, i (room.slug + (source ?? "") + i)}
        {@const effectiveRarity =
          draftPool.rarityOverrides[room.slug] ?? room.baseRarity}
        {@const annotations = draftPool.annotations[room.slug]}
        {@const rarityExplicit = room.slug in gameRarityOverrides}
        {@const rarityDynamic =
          room.slug in draftPool.rarityOverrides && !rarityExplicit}
        {@const description = upgrade
          ? [
              `(${upgrade.name ?? room.name} upgrade)`,
              upgrade.description ?? room.description,
            ]
              .filter(Boolean)
              .join(" ")
          : (room.description ?? undefined)}
        {@const placedCount = houseState.placedRooms.filter(
          (s) => s === room.slug,
        ).length}
        <tr>
          <td class="colors">
            {#each upgrade?.color ?? room.color as c}
              <span class="color-dot color-{c}"></span>
            {/each}
          </td>
          <td class="name" data-tooltip={description}
            >{upgrade?.name ?? room.name}</td
          >
          <td class="rarity rarity-{effectiveRarity}">
            {rarityName(effectiveRarity)}{#if rarityExplicit}<span
                class="rarity-base"
                data-tooltip="player-set rarity">**</span
              >{:else if rarityDynamic}<span
                class="rarity-base"
                data-tooltip="dynamic rarity">*</span
              >{/if}{#if annotations?.length}<span
                class="annot-icon"
                data-tooltip={formatAnnotations(annotations)}>?</span
              >{/if}
          </td>
          <td class="doors">{room.doors ?? "—"}</td>
          <td class="tags">
            {#if room.deadEnd}<span class="tag tag-dead-end">dead end</span
              >{/if}
            {#if room.mechanical}<span class="tag tag-mechanical"
                >mechanical</span
              >{/if}
            {#if room.tomorrow}<span class="tag tag-tomorrow">tomorrow</span
              >{/if}
            {#if room.drafting}<span class="tag tag-drafting">drafting</span
              >{/if}
            {#if room.outer}<span class="tag tag-outer">outer room</span>{/if}
          </td>
          <td class="source">
            {#if source}<span class="source-label"
                >{SOURCE_LABELS[source] ?? source}</span
              >{/if}
          </td>
          <td class="place-btns">
            {#if placedCount > 0}
              <span class="placed-count">{placedCount}</span>
              <button
                class="place-btn minus"
                onclick={() => removeRoomFromHouse(room.slug)}>−</button
              >
            {/if}
            <button
              class="place-btn plus"
              data-tooltip="add to house"
              onclick={() => addRoomToHouse(room.slug)}>+</button
            >
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  h2 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th {
    text-align: left;
    padding: 0.35rem 0.6rem;
    border-bottom: 2px solid var(--border);
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  td {
    padding: 0.3rem 0.6rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .colors {
    white-space: nowrap;
  }

  .color-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 2px;
  }

  .color-blue {
    background: #3b82f6;
  }
  .color-purple {
    background: #8b5cf6;
  }
  .color-orange {
    background: #f59e0b;
  }
  .color-green {
    background: #22c55e;
  }
  .color-gold {
    background: #facc15;
  }
  .color-red {
    background: #ef4444;
  }
  .color-black {
    background: #6b7280;
  }

  .rarity {
    font-size: 0.8rem;
    white-space: nowrap;
  }
  .rarity-1 {
    color: #9ca3af;
  }
  .rarity-2 {
    color: var(--text);
  }
  .rarity-3 {
    color: #60a5fa;
  }
  .rarity-4 {
    color: #c084fc;
  }
  .rarity-null {
    color: #f59e0b;
  }

  .rarity-base {
    color: var(--text-muted);
    font-size: 0.7rem;
    cursor: help;
    position: relative;
  }

  .rarity-base::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #111827;
    color: #f9fafb;
    border: 1px solid #374151;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 400;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    z-index: 10;
    transition: opacity 0.1s;
  }

  .rarity-base:hover::after {
    opacity: 1;
  }

  .name[data-tooltip] {
    cursor: help;
    position: relative;
  }

  .name[data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #111827;
    color: #f9fafb;
    border: 1px solid #374151;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 400;
    white-space: normal;
    width: max-content;
    max-width: 280px;
    pointer-events: none;
    opacity: 0;
    z-index: 10;
    transition: opacity 0.1s;
  }

  .name[data-tooltip]:hover::after {
    opacity: 1;
  }

  .doors {
    color: var(--text-muted);
    text-align: center;
  }

  .tags {
    white-space: nowrap;
  }

  .tag {
    display: inline-block;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 500;
    margin-right: 3px;
  }

  .tag-dead-end {
    background: #e5e7eb;
    color: #6b7280;
  }
  .tag-mechanical {
    background: #dbeafe;
    color: #3b82f6;
  }
  .tag-tomorrow {
    background: #ede9fe;
    color: #7c3aed;
  }
  .tag-drafting {
    background: #dcfce7;
    color: #16a34a;
  }
  .tag-outer {
    background: #ebe8d7;
    color: #6b6245;
  }

  @media (prefers-color-scheme: dark) {
    .tag-dead-end {
      background: #374151;
      color: #d1d5db;
    }
    .tag-mechanical {
      background: #1e3a5f;
      color: #93c5fd;
    }
    .tag-tomorrow {
      background: #3b1f5e;
      color: #d8b4fe;
    }
    .tag-drafting {
      background: #14532d;
      color: #86efac;
    }
    .tag-outer {
      background: #2e2b1d;
      color: #a8a07a;
    }
  }

  :global(html[data-theme="dark"]) .tag-dead-end {
    background: #374151;
    color: #d1d5db;
  }
  :global(html[data-theme="dark"]) .tag-mechanical {
    background: #1e3a5f;
    color: #93c5fd;
  }
  :global(html[data-theme="dark"]) .tag-tomorrow {
    background: #3b1f5e;
    color: #d8b4fe;
  }
  :global(html[data-theme="dark"]) .tag-drafting {
    background: #14532d;
    color: #86efac;
  }
  :global(html[data-theme="dark"]) .tag-outer {
    background: #451a03;
    color: #fcd34d;
  }

  :global(html[data-theme="light"]) .tag-dead-end {
    background: #e5e7eb;
    color: #6b7280;
  }
  :global(html[data-theme="light"]) .tag-mechanical {
    background: #dbeafe;
    color: #3b82f6;
  }
  :global(html[data-theme="light"]) .tag-tomorrow {
    background: #ede9fe;
    color: #7c3aed;
  }
  :global(html[data-theme="light"]) .tag-drafting {
    background: #dcfce7;
    color: #16a34a;
  }
  :global(html[data-theme="light"]) .tag-outer {
    background: #fef3c7;
    color: #b45309;
  }

  .source-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .annot-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--border);
    color: var(--text-muted);
    font-size: 0.65rem;
    font-weight: 700;
    cursor: help;
    position: relative;
    vertical-align: middle;
    margin-left: 3px;
  }

  .annot-icon::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    right: 0;
    background: #111827;
    color: #f9fafb;
    border: 1px solid #374151;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 400;
    white-space: pre-line;
    width: max-content;
    max-width: 300px;
    pointer-events: none;
    opacity: 0;
    z-index: 10;
    transition: opacity 0.1s;
  }

  .annot-icon:hover::after {
    opacity: 1;
  }

  .place-btns {
    white-space: nowrap;
    text-align: right;
    padding-right: 0.4rem;
  }

  .placed-count {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-right: 2px;
  }

  .place-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 3px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    margin-left: 2px;
  }

  .place-btn:hover {
    background: var(--border);
    color: var(--text);
  }

  .place-btn.plus {
    color: var(--text-muted);
    border-color: var(--border);
  }

  .place-btn.plus:hover {
    background: var(--border);
    color: var(--text);
  }

  .place-btn.minus {
    color: #ef4444;
    border-color: #ef444444;
  }

  .place-btn.minus:hover {
    background: #ef444422;
    color: #ef4444;
  }
</style>
