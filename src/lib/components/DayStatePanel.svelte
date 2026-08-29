<script lang="ts">
  import { type DayState, type RoomColor } from "bp-logic";
  import { loadPanelOpen, savePanelOpen } from "../panelState";

  let { dayState = $bindable(), open = $bindable(loadPanelOpen("day", false)) }: { dayState: DayState; open: boolean } = $props();

  $effect(() => savePanelOpen("day", open));

  const ROOM_COLORS: RoomColor[] = [
    "blue",
    "purple",
    "orange",
    "green",
    "gold",
    "red",
    "black",
  ];
</script>

<details class="panel" bind:open>
  <summary class="panel-header">Day</summary>
  <div class="fields">
    <div class="inline-fields">
      <label class="inline-field">
        Day:
        <input type="number" min="1" bind:value={dayState.day} />
      </label>
    </div>

    <div class="day-cols">
      <!-- LEFT COLUMN: Items -->
      <div class="day-col">
        <div class="section">
          <div class="section-label">Items</div>
          <div class="checks">
            <label data-tooltip="Adds Morning Room"
              ><input type="checkbox" bind:checked={dayState.baconAndEggs} /> Bacon
              &amp; Eggs</label
            >
            <label data-tooltip="Chance of setting Workshop to standard"
              ><input type="checkbox" bind:checked={dayState.haveBatteryPack} />
              Battery Pack</label
            >
            <label data-tooltip="Sets Workshop and Boiler Room to standard"
              ><input type="checkbox" bind:checked={dayState.haveGearWrench} /> Gear
              Wrench</label
            >
            <label data-tooltip="Mechanical rooms appear more often"
              ><input
                type="checkbox"
                bind:checked={dayState.haveElectromagnet}
              /> Electromagnet</label
            >
            <label data-tooltip="Tomorrow rooms appear more often"
              ><input type="checkbox" bind:checked={dayState.haveChronograph} />
              Chronograph</label
            >
            <label
              data-tooltip="Increases chance of drawing a Bookshop from the Library"
              ><input type="checkbox" bind:checked={dayState.haveHallPass} />
              Hall Pass</label
            >
            <label class="select-row">
              <select class="color-select" bind:value={dayState.scepterColor}>
                <option value={null}>—</option>
                {#each ROOM_COLORS as color}
                  <option value={color}>{color}</option>
                {/each}
              </select>
              Royal Scepter
            </label>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Chess, Constellations, Specific Rooms -->
      <div class="day-col">
        <div class="section">
          <div class="section-label">Chess</div>
          <div class="checks">
            <label data-tooltip="Adds Armory"
              ><input type="checkbox" bind:checked={dayState.knightChess} /> Knight
              Chess</label
            >
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

        <div class="section">
          <div class="section-label">Constellations</div>
          <div class="checks">
            <label data-tooltip="Rooms with four doors appear more often"
              ><input
                type="checkbox"
                bind:checked={dayState.southernCrossActive}
              /> Southern Cross</label
            >
            <label data-tooltip="Dead end rooms appear more often"
              ><input type="checkbox" bind:checked={dayState.draxusActive} /> Draxus</label
            >
          </div>
        </div>

        <div class="section">
          <div class="section-label">Specific Rooms</div>
          <div class="checks">
            <label
              data-tooltip="Mail Room is set to common rarity when a package is available"
              ><input type="checkbox" bind:checked={dayState.mailRoomUsed} /> Mail
              Room Package</label
            >
            <label data-tooltip="Coat Check rarity mechanism is unknown"
              ><input type="checkbox" bind:checked={dayState.coatCheckUsed} /> Coat
              Checked Item</label
            >
            <label
              data-tooltip="Activating the Boiler Room increases the chances of &quot;duct drafting&quot; powered &amp; connector rooms from each other."
              ><input type="checkbox" bind:checked={dayState.boilerActivated} />
              Boiler Activated</label
            >
          </div>
        </div>
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
</style>
