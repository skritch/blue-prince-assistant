<script lang="ts">
  import { type DayState, type RoomColor } from 'bp-logic';

  let { dayState }: { dayState: DayState } = $props();

  const ROOM_COLORS: RoomColor[] = ['blue', 'purple', 'orange', 'green', 'gold', 'red', 'black'];
</script>

<details class="panel" open>
  <summary class="panel-header">Day State</summary>
  <div class="fields">
    <div class="inline-fields">
      <label>
        Day
        <input type="number" min="1" bind:value={dayState.day} />
      </label>
      <label>
        Gems
        <input type="number" min="0" bind:value={dayState.gems} />
      </label>
      <label>
        Aquarium Activations
        <input
          type="number"
          min="0"
          value={dayState.aquariumExperimentActivations ?? ''}
          oninput={(e) => {
            const v = e.currentTarget.valueAsNumber;
            dayState.aquariumExperimentActivations = isNaN(v) ? null : v;
          }}
        />
      </label>
      <label>
        Chess Color
        <select bind:value={dayState.chessColor}>
          <option value={null}>None</option>
          {#each ROOM_COLORS as color}
            <option value={color}>{color}</option>
          {/each}
        </select>
      </label>
      <label>
        Scepter Color
        <select bind:value={dayState.scepterColor}>
          <option value={null}>None</option>
          {#each ROOM_COLORS as color}
            <option value={color}>{color}</option>
          {/each}
        </select>
      </label>
      <label>
        Monk
        <input
          type="text"
          value={dayState.monk ?? ''}
          oninput={(e) => { dayState.monk = e.currentTarget.value || null; }}
        />
      </label>
    </div>
    <div class="checkboxes">
      <label><input type="checkbox" bind:checked={dayState.knightChess} /> Knight Chess</label>
      <label><input type="checkbox" bind:checked={dayState.chamberOfMirrorsInHouse} /> Chamber of Mirrors</label>
      <label><input type="checkbox" bind:checked={dayState.poolInHouse} /> Pool in House</label>
      <label><input type="checkbox" bind:checked={dayState.baconAndEggs} /> Bacon & Eggs</label>
      <label><input type="checkbox" bind:checked={dayState.haveBatteryPack} /> Battery Pack</label>
      <label><input type="checkbox" bind:checked={dayState.haveGearWrench} /> Gear Wrench</label>
      <label><input type="checkbox" bind:checked={dayState.furnaceInHouse} /> Furnace</label>
      <label><input type="checkbox" bind:checked={dayState.greenhouseInHouse} /> Greenhouse</label>
      <label><input type="checkbox" bind:checked={dayState.southernCrossActive} /> Southern Cross</label>
      <label><input type="checkbox" bind:checked={dayState.draxusActive} /> Draxus Active</label>
      <label><input type="checkbox" bind:checked={dayState.mailRoomUsed} /> Mail Room Used</label>
      <label><input type="checkbox" bind:checked={dayState.coatCheckUsed} /> Coat Check Used</label>
      <label><input type="checkbox" bind:checked={dayState.schoolhouseInHouse} /> Schoolhouse</label>
    </div>
  </div>
</details>
