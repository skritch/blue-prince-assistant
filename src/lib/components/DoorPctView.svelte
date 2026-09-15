<script lang="ts">
  import type {
    OrientationResult,
    DirectionResult,
    Rarity,
    Direction,
  } from "bp-logic";
  import {
    ROOMS,
    ADHOC_ADDITIONS,
    POOL_ADDITIONS,
    DEAD_END_DIRECTIONS,
    computeDirectionProbabilities,
  } from "bp-logic";
  import type { SpoilerSettings } from "../spoilerSettings";

  let {
    orientations,
    spoilerSettings,
    rarityOverrides,
    toDirection,
  }: {
    orientations: OrientationResult | undefined;
    spoilerSettings: SpoilerSettings;
    rarityOverrides: Record<string, Rarity>;
    toDirection: Direction | undefined;
  } = $props();

  const ROOM_BY_SLUG = Object.fromEntries(ROOMS.map((r) => [r.slug, r]));
  const ALWAYS_SHOW_PAGES = new Set([7, 8]);
  const ALWAYS_SHOW_SLUGS = new Set([...ADHOC_ADDITIONS, ...POOL_ADDITIONS]);

  const SYMBOL_ORDER = [
    "∏",
    "║",
    "═",
    "╔",
    "╗",
    "╚",
    "╝",
    "╦",
    "╩",
    "╠",
    "╣",
    "╬",
  ];
  const DIR_ORDER: Direction[] = ["N", "E", "S", "W"];

  type SlotData = { p: number; rooms: string[] };
  type Row = { label: string; slots: (SlotData | null)[]; rerollSlot?: number };

  const orientationRows = $derived.by<Row[]>(() => {
    if (!orientations) return [];
    const seen = new Set<string>();
    for (const slot of orientations) {
      for (const sym of Object.keys(slot)) seen.add(sym);
    }
    return SYMBOL_ORDER.filter((s) => seen.has(s)).map((sym) => {
      const label =
        sym === "∏" && toDirection ? DEAD_END_DIRECTIONS[toDirection] : sym;
      return {
        label,
        rerollSlot: sym === "∏" ? 1 : undefined,
        slots: orientations!.map((slot) => {
          const entry = slot[sym as keyof typeof slot];
          return entry ? { p: entry.p, rooms: entry.rooms } : null;
        }),
      };
    });
  });

  const directionRows = $derived.by<Row[]>(() => {
    if (!orientations || !toDirection) return [];
    const result: DirectionResult = computeDirectionProbabilities(
      orientations,
      toDirection,
    );
    const seen = new Set<Direction>();
    for (const slot of result) {
      for (const d of Object.keys(slot) as Direction[]) seen.add(d);
    }
    return DIR_ORDER.filter((d) => seen.has(d)).map((dir) => ({
      label: dir,
      slots: result.map((slot) => slot[dir] ?? null),
    }));
  });

  const showAll = $derived(
    spoilerSettings.allRooms || spoilerSettings.entireGame,
  );

  function isHidden(slug: string): boolean {
    if (showAll) return false;
    const room = ROOM_BY_SLUG[slug];
    if (!room) return false;
    if (ALWAYS_SHOW_PAGES.has(room.directoryPage)) return false;
    if (ALWAYS_SHOW_SLUGS.has(slug)) return false;
    const rarity = rarityOverrides[slug] ?? room.baseRarity;
    if (spoilerSettings.room46) return rarity === 4;
    return (rarity !== null && rarity >= 3) || room.directoryPage === 9;
  }

  function fmtPct(p: number): string {
    if (p < 0.0005) return "—";
    return (p * 100).toFixed(1) + "%";
  }

  function tooltipRooms(rooms: string[]): string {
    const unique = [...new Set(rooms)];
    const visible = unique.filter((s) => !isHidden(s));
    const hiddenCount = unique.length - visible.length;
    const names = visible.map((s) => ROOM_BY_SLUG[s]?.name ?? s);
    if (hiddenCount > 0) {
      const label = spoilerSettings.room46
        ? `${hiddenCount} rare room${hiddenCount > 1 ? "s" : ""}...`
        : `${hiddenCount} unusual/rare room${hiddenCount > 1 ? "s" : ""}...`;
      names.push(label);
    }
    return names.join(", ");
  }
</script>

{#if !orientations}
  <p class="empty">
    Configure a house draft location to see door orientation probabilities.
  </p>
{:else}
  <table class="door-table">
    <thead>
      <tr>
        <th class="label-col"></th>
        <th>Slot 1</th>
        <th>Slot 2</th>
        <th>Slot 3</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section-header">
        <td>Shape</td><td></td><td></td><td></td>
      </tr>
      {#each orientationRows as row, i}
        <tr>
          <td class="sym-cell" class:dead-end={row.rerollSlot !== undefined}
            >{row.label}</td
          >
          {#each row.slots as slot, si}
            {#if slot && slot.p >= 0.0005}
              <td class="pct-cell"
                ><span data-tooltip={tooltipRooms(slot.rooms)}
                  >{fmtPct(slot.p)}</span
                >{#if row.rerollSlot === si}<span
                    class="reroll-note"
                    data-tooltip="Slot 2 is rerolled when all three slots draw a dead end. The probabilities in this column already account for this."
                    >*</span
                  >{/if}</td
              >
            {:else}
              <td class="nil-cell">—</td>
            {/if}
          {/each}
        </tr>
      {/each}

      {#if directionRows.length > 0}
        <tr class="section-header">
          <td>Exit direction</td><td></td><td></td><td></td>
        </tr>
        {#each directionRows as row}
          <tr>
            <td class="label-cell">{row.label}</td>
            {#each row.slots as slot}
              {#if slot && slot.p >= 0.0005}
                <td class="pct-cell">
                  <span data-tooltip={tooltipRooms(slot.rooms)}
                    >{fmtPct(slot.p)}</span
                  >
                </td>
              {:else}
                <td class="nil-cell">—</td>
              {/if}
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
{/if}

<style>
  .empty {
    color: var(--text-muted);
    font-size: 0.875rem;
    padding: 2rem 0;
    text-align: center;
  }

  .door-table {
    border-collapse: collapse;
    font-size: 0.875rem;
    width: 100%;
  }

  .door-table th {
    text-align: right;
    padding: 0.35rem 0.75rem;
    border-bottom: 2px solid var(--border);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .door-table th.label-col {
    text-align: center;
  }

  .door-table td {
    padding: 0.3rem 0.75rem;
    border-bottom: 1px solid var(--border);
    text-align: right;
  }

  .door-table tr:last-child td {
    border-bottom: none;
  }

  .section-header td {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    padding-top: 0.6rem;
    padding-bottom: 0.2rem;
    border-bottom: 1px solid var(--border);
    text-align: right;
  }

  .section-header td:first-child {
    text-align: center;
  }

  .door-table .sym-cell {
    font-size: 1.25rem;
    text-align: center;
    font-family: monospace;
    color: var(--text);
  }

  .door-table .sym-cell.dead-end {
    font-weight: bold;
  }

  .door-table .label-cell {
    font-size: 0.8rem;
    font-weight: 600;
    text-align: center;
    color: var(--text);
    font-family: monospace;
  }

  .pct-cell {
    color: var(--text);
    cursor: default;
  }

  .nil-cell {
    color: var(--text-muted);
    opacity: 0.4;
  }

  /* Align tooltip to the right so it doesn't clip off-screen */
  .pct-cell :global([data-tooltip])::after {
    left: auto;
    right: 0;
  }

  .reroll-note {
    font-size: 0.7rem;
    color: var(--text-muted);
    vertical-align: super;
    margin-left: 1px;
    cursor: default;
  }

  .reroll-note[data-tooltip]::after {
    right: auto;
    left: 0;
  }
</style>
