<script lang="ts">
  import { type DayState, type RoomColor } from "bp-logic";

  let { dayState }: { dayState: DayState } = $props();

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
    "These settings are not synced from the house state, and should be set manually.";
</script>

<details class="panel" open>
  <summary class="panel-header">Daily State</summary>
  <div class="fields">
    <div class="inline-fields">
      <label class="inline-field">
        Day
        <input type="number" min="1" bind:value={dayState.day} />
      </label>
    </div>

    <div class="day-cols">
      <!-- LEFT COLUMN -->
      <div class="day-col">
        <div class="section">
          <div class="section-label">
            Additions to Deck
            <span class="help-icon" data-tooltip={NOT_SYNCED}>?</span>
          </div>
          <div class="checks">
            <label data-tooltip="Adds Armory"
              ><input
                type="checkbox"
                bind:checked={dayState.knightChess}
              />Mantle of the Knight</label
            >
            <label data-tooltip="Adds Pump Room, Locker Room, and Sauna"
              ><input type="checkbox" bind:checked={dayState.poolInHouse} /> Pool</label
            >
            <label data-tooltip="Adds Morning Room"
              ><input type="checkbox" bind:checked={dayState.baconAndEggs} /> Bacon
              &amp; Eggs</label
            >
            <label
              data-tooltip="Adds 8 Classrooms; Library, Dormitory, and Classroom appear more often"
              ><input
                type="checkbox"
                bind:checked={dayState.schoolhouseInHouse}
              /> Schoolhouse</label
            >
            <label
              data-tooltip="Re-adds many rooms after they are drafted, or prevents their removal the first time they are drafted. Does not add two copies at once."
              ><input
                type="checkbox"
                bind:checked={dayState.chamberOfMirrorsInHouse}
              /> Chamber of Mirrors</label
            >
            <label class="select-row">
              Aquarium Experiment
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
            </label>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Misc.</div>
          <div class="checks">
            <label
              data-tooltip="Mail Room is set to common rarity when a package is available"
              ><input type="checkbox" bind:checked={dayState.mailRoomUsed} /> Mail
              Room Package</label
            >
            <label data-tooltip="Coat Check rarity mechanism is unknown"
              ><input type="checkbox" bind:checked={dayState.coatCheckUsed} /> Coat
              Check Item</label
            >
            <label
              class="select-row"
              data-tooltip="Coat Check becomes more rare each time it appears in a draft"
            >
              Coat Check drafted today
              <input
                type="number"
                min="0"
                max="2"
                class="narrow"
                bind:value={dayState.coatCheckDraftedToday}
              />
            </label>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="day-col">
        <div class="section">
          <div class="section-label">
            Biases
            <span class="help-icon" data-tooltip={NOT_SYNCED}>?</span>
          </div>
          <div class="checks">
            <label
              ><input type="checkbox" bind:checked={dayState.furnaceInHouse} /> Furnace</label
            >
            <label
              ><input
                type="checkbox"
                bind:checked={dayState.greenhouseInHouse}
              /> Greenhouse</label
            >
            <label
              ><input
                type="checkbox"
                bind:checked={dayState.southernCrossActive}
              /> Southern Cross Constellation</label
            >
            <label
              ><input type="checkbox" bind:checked={dayState.draxusActive} /> Draxus
              Constellation</label
            >
            <label class="select-row">
              Banner of the King
              <select bind:value={dayState.chessColor}>
                <option value={null}>—</option>
                {#each ROOM_COLORS as color}
                  <option value={color}>{color}</option>
                {/each}
              </select>
            </label>
            <label class="select-row">
              Royal Scepter
              <select bind:value={dayState.scepterColor}>
                <option value={null}>—</option>
                {#each ROOM_COLORS as color}
                  <option value={color}>{color}</option>
                {/each}
              </select>
            </label>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Items</div>
          <div class="checks">
            <label data-tooltip="Chance of setting Workshop to standard (2)"
              ><input type="checkbox" bind:checked={dayState.haveBatteryPack} />
              Battery Pack</label
            >
            <label data-tooltip="Sets Workshop and Boiler Room to standard (2)"
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

  .narrow {
    width: 3.5rem;
  }
</style>
