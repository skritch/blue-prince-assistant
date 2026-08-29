<script lang="ts">
  import { ROOMS, type HouseState } from "bp-logic";
  import SearchPairInput from "./SearchPairInput.svelte";
  import type { Entry } from "./searchPairTypes";
  import { loadPanelOpen, savePanelOpen } from "../panelState";

  let { houseState = $bindable() }: { houseState: HouseState } = $props();

  let open = $state(loadPanelOpen("house", false));
  $effect(() => savePanelOpen("house", open));

  const roomNameBySlug = Object.fromEntries(ROOMS.map((r) => [r.slug, r.name]));

  const roomSearchItems = ROOMS.map((r) => ({
    id: r.slug,
    label: r.name,
  })).sort((a, b) => a.label.localeCompare(b.label));

  // Rooms whose flag is always in sync with placedRooms (checked ↔ room present)
  const SPECIAL_ROOMS: { slug: string; flag: keyof HouseState; label: string; tooltip: string }[] = [
    { slug: 'pool', flag: 'poolInHouse', label: 'Pool', tooltip: 'Adds Pump Room, Locker Room, and Sauna to draft pool' },
    { slug: 'schoolhouse', flag: 'schoolhouseInHouse', label: 'Schoolhouse', tooltip: 'Adds 8 Classrooms. Library, Dormitory, and Classroom appear more often' },
    { slug: 'chamber-of-mirrors', flag: 'chamberOfMirrorsInHouse', label: 'Chamber of Mirrors', tooltip: 'Re-adds many rooms after they are drafted, or prevents their removal the first time they are drafted' },
    { slug: 'greenhouse', flag: 'greenhouseInHouse', label: 'Greenhouse', tooltip: 'Green rooms appear more often' },
    { slug: 'solarium', flag: 'solariumInHouse', label: 'Solarium', tooltip: 'Rare rooms appear more often' },
    { slug: 'foundation', flag: 'foundationDrafted', label: 'Foundation', tooltip: 'Lowers Master Bedroom from rare to unusual; raises Billiard Room to unusual on day 7+' },
  ];

  const FURNACE_NOTE = "The Furnace's red-room bias can be blocked by certain in-game mechanics even when Furnace is in your house, so this is set independently from the placed rooms list.";

  function syncFlags(state: HouseState): HouseState {
    const updates: Partial<HouseState> = {};
    for (const { slug, flag } of SPECIAL_ROOMS) {
      (updates as Record<string, unknown>)[flag] = state.placedRooms.includes(slug);
    }
    return { ...state, ...updates };
  }

  // Incremented only when rooms are explicitly added/removed via SearchPairInput,
  // so checkbox-triggered placedRooms changes don't collapse the list.
  let searchKey = $state(0);

  let placedEntries: Entry[] = $derived(
    houseState.placedRooms.map((slug, i) => ({
      keyId: slug,
      keyLabel: roomNameBySlug[slug] ?? slug,
      removable: !((i === 0 && slug === 'entrance-hall') || (i === 1 && slug === 'antechamber')),
    })),
  );

  function addRoom(slug: string) {
    houseState = syncFlags({
      ...houseState,
      placedRooms: [...houseState.placedRooms, slug],
    });
    searchKey++;
  }

  function removeRoom(i: number) {
    // Don't allow removing the original entrance hall or antechamber (first two positions)
    const slug = houseState.placedRooms[i];
    if (i === 0 && slug === 'entrance-hall') return;
    if (i === 1 && slug === 'antechamber') return;

    const arr = [...houseState.placedRooms];
    arr.splice(i, 1);
    houseState = syncFlags({ ...houseState, placedRooms: arr });
    searchKey++;
  }

  function toggleSpecialRoom(slug: string, checked: boolean) {
    const placedRooms = [...houseState.placedRooms];
    if (checked && !placedRooms.includes(slug)) {
      placedRooms.push(slug);
    } else if (!checked) {
      const idx = placedRooms.lastIndexOf(slug);
      if (idx >= 0) placedRooms.splice(idx, 1);
    }
    houseState = syncFlags({ ...houseState, placedRooms });
  }
</script>

<details class="panel" bind:open>
  <summary class="panel-header">House</summary>
  <div class="fields">
    <label class="inline-field">
      House Rank Reached:
      <input type="number" min="1" max="9" bind:value={houseState.maxRank} />
    </label>
    <div class="section">
      <div class="section-label">Special Rooms</div>
      <div class="checks">
        {#each SPECIAL_ROOMS as { slug, label, tooltip }}
          <label data-tooltip={tooltip}>
            <input
              type="checkbox"
              checked={houseState.placedRooms.includes(slug)}
              onchange={(e) => toggleSpecialRoom(slug, e.currentTarget.checked)}
            /> {label}
          </label>
        {/each}
        <label>
          <input type="checkbox" bind:checked={houseState.furnaceInHouse} />
          Furnace
          <span class="help-icon" data-tooltip={FURNACE_NOTE}>?</span>
        </label>
      </div>
    </div>
    {#key searchKey}
      <SearchPairInput
        label="Placed Rooms ({houseState.placedRooms.length})"
        searchItems={roomSearchItems}
        entries={placedEntries}
        onadd={addRoom}
        onremove={removeRoom}
      />
    {/key}
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

  .checks {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .checks label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.875rem;
  }

  .help-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1em;
    height: 1.1em;
    border-radius: 50%;
    border: 1px solid var(--text-muted);
    font-size: 0.7rem;
    color: var(--text-muted);
    cursor: default;
    flex-shrink: 0;
  }
</style>
