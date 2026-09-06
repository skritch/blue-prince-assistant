<script lang="ts">
  import { type DraftPool, type Rarity } from "bp-logic";
  import ColorDots from "./ColorDots.svelte";

  let { draftPool }: { draftPool: DraftPool } = $props();

  function pSum(pSlot: [number, number, number] | undefined): number {
    return pSlot ? pSlot.reduce((s, p) => s + p, 0) : 0;
  }

  function roomsForCategory(isFree: boolean, rarity: Rarity) {
    return [...draftPool.rooms]
      .filter((pr) => {
        const effectiveRarity = draftPool.rarityOverrides[pr.room.slug] ?? pr.room.baseRarity;
        const free = !pr.room.baseGemCost;
        return effectiveRarity === rarity && free === isFree;
      })
      .sort((a, b) => {
        const pa = pSum(a.pSlot);
        const pb = pSum(b.pSlot);
        if (pa !== pb) return pb - pa;
        const ga = a.room.baseGemCost ?? 0;
        const gb = b.room.baseGemCost ?? 0;
        if (ga !== gb) return ga - gb;
        if (a.room.directoryPage !== b.room.directoryPage)
          return a.room.directoryPage - b.room.directoryPage;
        return a.room.roomNumber - b.room.roomNumber;
      });
  }

  function makeTooltip(pr: ReturnType<typeof roomsForCategory>[number]): string | undefined {
    const lines: string[] = [];
    const desc = pr.upgrade?.description ?? pr.room.description;
    if (desc) lines.push(desc);
    if (pr.pSlot) {
      lines.push(pr.pSlot.map((p) => `${(p * 100).toFixed(1)}%`).join(" | "));
    }
    return lines.length ? lines.join("\n") : undefined;
  }

  const CATEGORIES: { label: string; isFree: boolean; rarity: Rarity }[] = [
    { label: "Free commonplace", isFree: true, rarity: 1 },
    { label: "Free standard", isFree: true, rarity: 2 },
    { label: "Free unusual", isFree: true, rarity: 3 },
    { label: "Free rare", isFree: true, rarity: 4 },
    { label: "Gem commonplace", isFree: false, rarity: 1 },
    { label: "Gem standard", isFree: false, rarity: 2 },
    { label: "Gem unusual", isFree: false, rarity: 3 },
    { label: "Gem rare", isFree: false, rarity: 4 },
  ];
</script>

<section>
  <table>
    <thead>
      <tr>
        <th>Deck</th>
        <th>Rooms</th>
      </tr>
    </thead>
    <tbody>
      {#each CATEGORIES as { label, isFree, rarity }}
        {@const rooms = roomsForCategory(isFree, rarity)}
        <tr class:empty={rooms.length === 0}>
          <td class="category rarity-{rarity}">{label}</td>
          <td class="room-list">
            {#each rooms as pr, i}
              {@const tooltip = makeTooltip(pr)}
              {@const colors = pr.upgrade?.color ?? pr.room.color}
              <span class="room-chip" class:has-tooltip={!!tooltip} data-tooltip={tooltip}
                ><ColorDots {colors} /><span class="room-name">{pr.upgrade?.name ?? pr.room.name}</span></span
              >{#if i < rooms.length - 1}<span class="sep">, </span>{/if}
            {/each}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  section {
    width: 100%;
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
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .category {
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    width: 130px;
    min-width: 130px;
    padding-top: 0.55rem;
  }

  .room-list {
    color: var(--text);
    line-height: 1.9;
  }

  .room-chip {
    display: inline;
    white-space: nowrap;
  }

  .room-chip.has-tooltip {
    cursor: help;
    position: relative;
  }

  .room-chip.has-tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    background: #111827;
    color: #f9fafb;
    border: 1px solid #374151;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 400;
    white-space: pre-line;
    width: max-content;
    max-width: 280px;
    pointer-events: none;
    opacity: 0;
    z-index: 10;
    transition: opacity 0.1s;
  }

  .room-chip.has-tooltip:hover::after {
    opacity: 1;
  }

  .room-name {
    vertical-align: middle;
  }

  .sep {
    color: var(--text-muted);
  }

  .sep + .room-chip {
    padding-left: 0.3em;
  }

  .empty td {
    opacity: 0.4;
  }

  .rarity-1 { color: #9ca3af; }
  .rarity-2 { color: var(--text); }
  .rarity-3 { color: #60a5fa; }
  .rarity-4 { color: #c084fc; }
</style>
