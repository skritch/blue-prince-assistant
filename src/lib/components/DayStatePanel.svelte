<script lang="ts">
  import { type DayState, type RoomColor } from "bp-logic";
  import type { SpoilerSettings } from "../spoilerSettings";
  import { loadPanelOpen, savePanelOpen } from "../panelState";
  import SearchPairInput from "./SearchPairInput.svelte";
  import type { Item, Entry } from "./SearchPairInput.svelte";

  let {
    dayState = $bindable(),
    open = $bindable(loadPanelOpen("day", false)),
    spoilerSettings,
  }: { dayState: DayState; open: boolean; spoilerSettings: SpoilerSettings } = $props();

  $effect(() => savePanelOpen("day", open));

  const ROOM_COLORS: RoomColor[] = [
    "blue", "purple", "orange", "green", "gold", "red", "black",
  ];

  // --- Spoiler gates ---
  const showAllItems       = $derived(spoilerSettings.allItems || spoilerSettings.entireGame);
  const showRoyalScepter   = $derived(spoilerSettings.entireGame);
  const showChess          = $derived(spoilerSettings.precipiceSolved || spoilerSettings.entireGame);
  const showConstellations = $derived(spoilerSettings.westGate || spoilerSettings.entireGame);
  const showConstellationCheckboxes = $derived(spoilerSettings.room46 || spoilerSettings.entireGame);
  const showSpecificRoomDetails = $derived(spoilerSettings.westGate || spoilerSettings.entireGame);
  const showBoilerTooltip  = $derived(spoilerSettings.allRooms || spoilerSettings.entireGame);

  // --- Items autocomplete (shown when !showAllItems) ---
  type ItemField = 'haveBatteryPack' | 'haveGearWrench' | 'haveElectromagnet'
                 | 'haveChronograph' | 'haveHallPass' | 'haveCompass';

  const ALL_ITEMS: Array<{ id: ItemField; label: string }> = [
    { id: 'haveBatteryPack',  label: 'Battery Pack' },
    { id: 'haveChronograph',  label: 'Chronograph' },
    { id: 'haveCompass',      label: 'Compass' },
    { id: 'haveElectromagnet',label: 'Electromagnet' },
    { id: 'haveGearWrench',   label: 'Gear Wrench' },
    { id: 'haveHallPass',     label: 'Hall Pass' },
  ];

  // Only offer items not yet active
  let itemSearchItems: Item[] = $derived(
    ALL_ITEMS.filter((f) => !dayState[f.id]).map((f) => ({ id: f.id, label: f.label })),
  );

  let itemEntries: Entry[] = $derived(
    ALL_ITEMS.filter((f) => dayState[f.id]).map((f) => ({ keyId: f.id, keyLabel: f.label })),
  );

  function addItem(fieldId: string) {
    dayState = { ...dayState, [fieldId]: true };
  }

  function removeItem(i: number) {
    dayState = { ...dayState, [itemEntries[i].keyId]: false };
  }

  // --- Constellations autocomplete (shown when westGate but !room46) ---
  type ConstellationField = 'southernCrossActive' | 'draxusActive';

  const ALL_CONSTELLATIONS: Array<{ id: ConstellationField; label: string }> = [
    { id: 'southernCrossActive', label: 'Southern Cross' },
    { id: 'draxusActive',        label: 'Draxus' },
  ];

  let constellationSearchItems: Item[] = $derived(
    ALL_CONSTELLATIONS.filter((f) => !dayState[f.id]).map((f) => ({ id: f.id, label: f.label })),
  );

  let constellationEntries: Entry[] = $derived(
    ALL_CONSTELLATIONS.filter((f) => dayState[f.id]).map((f) => ({ keyId: f.id, keyLabel: f.label })),
  );

  function addConstellation(fieldId: string) {
    dayState = { ...dayState, [fieldId]: true };
  }

  function removeConstellation(i: number) {
    dayState = { ...dayState, [constellationEntries[i].keyId]: false };
  }
</script>

<details class="panel" bind:open>
  <summary class="panel-header">Day {dayState.day}: Conditions & Items</summary>
  <div class="fields">
    <div class="day-cols">
      <!-- LEFT COLUMN: Items -->
      <div class="day-col">
        <div class="section">
          <div class="section-label">Items</div>
          <div class="checks">
            <label data-tooltip="Adds Morning Room">
              <input type="checkbox" bind:checked={dayState.baconAndEggs} /> Bacon &amp; Eggs
            </label>
          </div>
          {#if showAllItems}
            <div class="checks">
              <label data-tooltip="Chance of setting Workshop to standard">
                <input type="checkbox" bind:checked={dayState.haveBatteryPack} /> Battery Pack
              </label>
              <label data-tooltip="Sets Workshop and Boiler Room to standard">
                <input type="checkbox" bind:checked={dayState.haveGearWrench} /> Gear Wrench
              </label>
              <label data-tooltip="Mechanical rooms appear more often">
                <input type="checkbox" bind:checked={dayState.haveElectromagnet} /> Electromagnet
              </label>
              <label data-tooltip="Tomorrow rooms appear more often">
                <input type="checkbox" bind:checked={dayState.haveChronograph} /> Chronograph
              </label>
              <label data-tooltip="Increases chance of drawing a Bookshop from the Library">
                <input type="checkbox" bind:checked={dayState.haveHallPass} /> Hall Pass
              </label>
              <label data-tooltip="Biases room orientations to have a door facing north. This will be in effect even if the compass becomes part of a contraption, and even if that contraption is in an undrafted coat check.">
                <input type="checkbox" bind:checked={dayState.haveCompass} /> Compass
              </label>
              {#if showRoyalScepter}
                <label class="select-row">
                  <select class="color-select" bind:value={dayState.scepterColor}>
                    <option value={null}>—</option>
                    {#each ROOM_COLORS as color}
                      <option value={color}>{color}</option>
                    {/each}
                  </select>
                  Royal Scepter
                </label>
              {/if}
            </div>
          {:else}
            <SearchPairInput
              label="Found Items"
              alwaysOpen={true}
              placeholder="Search items..."
              searchItems={itemSearchItems}
              entries={itemEntries}
              onadd={addItem}
              onremove={removeItem}
            />
          {/if}
        </div>

        {#if showConstellations}
          <div class="section">
            <div class="section-label">Constellations</div>
            {#if showConstellationCheckboxes}
              <div class="checks">
                <label data-tooltip="Rooms with four doors appear more often">
                  <input type="checkbox" bind:checked={dayState.southernCrossActive} /> Southern Cross
                </label>
                <label data-tooltip="Dead end rooms appear more often">
                  <input type="checkbox" bind:checked={dayState.draxusActive} /> Draxus
                </label>
              </div>
            {:else}
              <SearchPairInput
                label="Active"
                alwaysOpen={true}
                placeholder="Search constellations..."
                searchItems={constellationSearchItems}
                entries={constellationEntries}
                onadd={addConstellation}
                onremove={removeConstellation}
              />
            {/if}
          </div>
        {/if}
      </div>

      <!-- RIGHT COLUMN: Specific Rooms, Chess -->
      <div class="day-col">
        <div class="section">
          <div class="section-label">Current Day</div>
          <label class="inline-field day-input">
            Day:
            <input type="number" min="1" bind:value={dayState.day} />
          </label>
        </div>

        <div class="section">
          <div class="section-label">Specific Rooms</div>
          <div class="checks">
            <label data-tooltip="Garage is only drawn as a weighted room if it hasn't been drawn yet today">
              <input type="checkbox" bind:checked={dayState.garageSeen} /> Garage Drawn
            </label>
            <label data-tooltip="Utility Closet is only drawn as a weighted room if it hasn't been drawn yet today">
              <input type="checkbox" bind:checked={dayState.utilityClosetSeen} /> Utility Closet Drawn
            </label>
            {#if showSpecificRoomDetails}
              <label data-tooltip="Mail Room is set to commonplace rarity when a package is available">
                <input type="checkbox" bind:checked={dayState.mailRoomUsed} /> Mail Room Package
              </label>
              <label data-tooltip="Coat Check rarity mechanism is unknown">
                <input type="checkbox" bind:checked={dayState.coatCheckUsed} /> Coat Checked Item
              </label>
              <label
                data-tooltip={showBoilerTooltip
                  ? "Activating the Boiler Room increases the chances of duct drafting powered & connector rooms from each other."
                  : undefined}
              >
                <input type="checkbox" bind:checked={dayState.boilerActivated} /> Boiler Activated
              </label>
            {/if}
          </div>
        </div>

        {#if showChess}
          <div class="section">
            <div class="section-label">Chess</div>
            <div class="checks">
              <label data-tooltip="Adds Armory">
                <input type="checkbox" bind:checked={dayState.knightChess} /> Knight Chess
              </label>
              <label class="select-row">
                <select class="color-select" bind:value={dayState.chessColor}>
                  <option value={null}>—</option>
                  {#each ROOM_COLORS as color}
                    <option value={color}>{color}</option>
                  {/each}
                </select>
                King Chess
              </label>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</details>

<style>
  .day-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: start;
  }

  .day-col {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

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
    display: flex;
    align-items: center;
    gap: 0.3rem;
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

  .select-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.875rem;
  }

  .color-select {
    flex: none;
    width: 5rem;
    min-width: 0;
  }

  .day-input {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.875rem;
  }

  .day-input input {
    width: 4rem;
  }
</style>
