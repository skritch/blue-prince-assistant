<script lang="ts">
  import type { OrientationResult, Rarity, Direction } from "bp-logic";
  import { ROOMS, ADHOC_ADDITIONS, POOL_ADDITIONS, DEAD_END_DIRECTIONS } from "bp-logic";
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

  function displaySymbol(sym: string): string {
    if (sym === "∏" && toDirection) return DEAD_END_DIRECTIONS[toDirection];
    return sym;
  }

  const ROOM_BY_SLUG = Object.fromEntries(ROOMS.map((r) => [r.slug, r]));
  const ALWAYS_SHOW_PAGES = new Set([7, 8]);
  const ALWAYS_SHOW_SLUGS = new Set([...ADHOC_ADDITIONS, ...POOL_ADDITIONS]);

  // Canonical display order for orientation symbols
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

  type SlotData = { p: number; rooms: string[] };
  type Row = { symbol: string; slots: (SlotData | null)[] };

  const rows = $derived.by<Row[]>(() => {
    if (!orientations) return [];

    const seen = new Set<string>();
    for (const slot of orientations) {
      for (const [sym] of slot) seen.add(sym);
    }

    return SYMBOL_ORDER.filter((s) => seen.has(s)).map((sym) => ({
      symbol: sym,
      slots: orientations!.map((slot) => {
        for (const [k, v] of slot) {
          if (k === sym) return { p: v.p, rooms: v.rooms };
        }
        return null;
      }),
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
  <p class="empty">Configure a house draft location to see door orientation probabilities.</p>
{:else}
  <table class="door-table">
    <thead>
      <tr>
        <th class="sym-col">Shape</th>
        <th>Slot 1</th>
        <th>Slot 2</th>
        <th>Slot 3</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row}
        <tr>
          <td class="sym-cell">{displaySymbol(row.symbol)}</td>
          {#each row.slots as slot, i}
            {#if slot && slot.p >= 0.0005}
              <td class="pct-cell"
                ><span data-tooltip={tooltipRooms(slot.rooms)}>{fmtPct(slot.p)}</span>{#if row.symbol === "∏" && i === 1}<span
                    class="reroll-note"
                    data-tooltip="Rerolled if all three slots draw a dead end"
                    >*</span
                  >{/if}</td>
            {:else}
              <td class="nil-cell">—</td>
            {/if}
          {/each}
        </tr>
      {/each}
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

  .door-table th.sym-col {
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

  .door-table .sym-cell {
    font-size: 1.25rem;
    text-align: center;
    font-family: monospace;
    color: var(--text);
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
