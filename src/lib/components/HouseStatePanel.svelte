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

  let placedEntries: Entry[] = $derived(
    houseState.placedRooms.map((slug) => ({
      keyId: slug,
      keyLabel: roomNameBySlug[slug] ?? slug,
    })),
  );

  function addRoom(slug: string) {
    houseState = {
      ...houseState,
      placedRooms: [...houseState.placedRooms, slug],
    };
  }

  function removeRoom(i: number) {
    const arr = [...houseState.placedRooms];
    arr.splice(i, 1);
    houseState = { ...houseState, placedRooms: arr };
  }
</script>

<details class="panel" bind:open>
  <summary class="panel-header">House</summary>
  <div class="fields">
    <label class="inline-field">
      House Rank Reached:
      <input type="number" min="1" max="9" bind:value={houseState.maxRank} />
    </label>
    <SearchPairInput
      label="Placed Rooms"
      searchItems={roomSearchItems}
      entries={placedEntries}
      onadd={addRoom}
      onremove={removeRoom}
    />
  </div>
</details>
