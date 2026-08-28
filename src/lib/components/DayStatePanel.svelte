<script lang="ts">
  import { type DayState, type RoomColor } from "bp-logic";
  import { loadPanelOpen, savePanelOpen } from "../panelState";

  let { dayState = $bindable() }: { dayState: DayState } = $props();

  let open = $state(loadPanelOpen("day", false));
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

  const NOT_SYNCED =
    "These options are not synced with rooms in the house, and should be set explicitly.";
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
      <!-- LEFT COLUMN -->
      <div class="day-col">
        <div class="section">
          <div class="section-label">
            Added Floorplans
            <span class="help-icon" data-tooltip={NOT_SYNCED}>?</span>
          </div>
          <div class="checks">
            <label data-tooltip="Adds Armory"
              ><input
                type="checkbox"
                bind:checked={dayState.knightChess}
              />Knight Chess</label
            >
            <label
              data-tooltip="Also adds Armory, but with slightly different mechanics"
              ><input
                type="checkbox"
                bind:checked={dayState.pawnChessKnight}
              />Pawn Chess → Knight</label
            >
            <label data-tooltip="Adds Morning Room"
              ><input type="checkbox" bind:checked={dayState.baconAndEggs} /> Bacon
              &amp; Eggs</label
            >
            <label
              class="select-row"
              data-tooltip="Each experiment activation adds 3 aquariums to the pool. Also sets Aquarium to commonplace."
            >
              <input
                type="number"
                min="0"
                class="narrow"
                value={dayState.aquariumExperimentActivations ?? ""}
                oninput={(e) => {
                  const v = e.currentTarget.valueAsNumber;
                  dayState.aquariumExperimentActivations = isNaN(v) ? null : v;
                }}
              />
              Aquarium Experiments
            </label>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Misc.</div>
          <div class="checks">
            <label
              data-tooltip="Lowers Master Bedroom from rare to unusual. Unknown effect if Foundation is no longer in the house."
              ><input
                type="checkbox"
                bind:checked={dayState.haveDraftedFoundation}
              /> Foundation Drafted</label
            >
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
              class="select-row"
              data-tooltip="Coat Check becomes more rare each time it appears in a draft"
            >
              <input
                type="number"
                min="0"
                max="2"
                class="narrow"
                bind:value={dayState.coatCheckDraftedToday}
              />
              Coat Check Appearances
            </label>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="day-col">
        <div class="section">
          <div class="section-label">
            Draft Biases
            <span class="help-icon" data-tooltip={NOT_SYNCED}>?</span>
          </div>
          <div class="checks">
            <label data-tooltip="Rooms with four doors appear more often"
              ><input
                type="checkbox"
                bind:checked={dayState.southernCrossActive}
              /> Southern Cross Constellation</label
            >
            <label data-tooltip="Dead end rooms appear more often"
              ><input type="checkbox" bind:checked={dayState.draxusActive} /> Draxus
              Constellation</label
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

        <div class="section">
          <div class="section-label">Items</div>
          <div class="checks">
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

  input[type="number"].narrow {
    flex: none;
    width: 2rem;
    -moz-appearance: textfield;
  }

  input[type="number"].narrow::-webkit-outer-spin-button,
  input[type="number"].narrow::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .color-select {
    flex: none;
    width: 5rem;
    min-width: 0;
  }
</style>
