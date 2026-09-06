<script lang="ts">
  import { type RoomColor } from "bp-logic";

  let { colors }: { colors: RoomColor[] } = $props();
</script>

{#each colors as c}
  <span class="color-dot color-{c}"></span>
{/each}

<style>
  .color-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 2px;
    vertical-align: middle;
  }

  .color-blue   { background: #3b82f6; }
  .color-purple { background: #8b5cf6; }
  .color-orange { background: #f59e0b; }
  .color-green  { background: #22c55e; }
  .color-gold   { background: #facc15; }
  .color-red    { background: #ef4444; }
  .color-black  { background: #6b7280; }
</style>
