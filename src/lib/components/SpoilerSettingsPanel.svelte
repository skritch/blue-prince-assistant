<script lang="ts">
  import type { SpoilerSettings } from '../spoilerSettings'

  let { settings = $bindable() }: { settings: SpoilerSettings } = $props()

  type Field = keyof SpoilerSettings

  const prereqs: Partial<Record<Field, Field>> = {
    antechamber: 'westGate',
    room46: 'antechamber',
    allRooms: 'room46',
    allItems: 'room46',
    precipiceAccessed: 'room46',
    precipiceSolved: 'precipiceAccessed',
    giftShop: 'room46',
  }

  function cascadeUncheck(s: SpoilerSettings, field: Field): SpoilerSettings {
    let next = { ...s, [field]: false }
    for (const [dep, pre] of Object.entries(prereqs) as [Field, Field][]) {
      if (pre === field && next[dep]) {
        next = cascadeUncheck(next, dep)
      }
    }
    return next
  }

  let confirmingEntireGame = $state(false)

  function toggle(field: Field, checked: boolean) {
    if (field === 'entireGame' && checked) {
      confirmingEntireGame = true
      return
    }
    confirmingEntireGame = false
    settings = checked ? { ...settings, [field]: true } : cascadeUncheck(settings, field)
  }

  function confirmEntireGame() {
    confirmingEntireGame = false
    settings = {
      westGate: true,
      antechamber: true,
      room46: true,
      allRooms: true,
      allItems: true,
      precipiceAccessed: true,
      precipiceSolved: true,
      giftShop: true,
      entireGame: true,
    }
  }
</script>

<div class="spoiler-panel">
  <label class="row locked">
    <input type="checkbox" checked disabled />
    <span>Initial game</span>
  </label>

  <label class="row" class:locked={settings.entireGame}>
    <input
      type="checkbox"
      checked={settings.westGate}
      disabled={settings.entireGame}
      onchange={(e) => toggle('westGate', e.currentTarget.checked)}
    />
    <span>Opened west gate</span>
  </label>

  {#if settings.westGate}
    <label class="row" class:locked={settings.entireGame}>
      <input
        type="checkbox"
        checked={settings.antechamber}
        disabled={settings.entireGame}
        onchange={(e) => toggle('antechamber', e.currentTarget.checked)}
      />
      <span>Reached Antechamber</span>
    </label>

    {#if settings.antechamber}
    <label class="row" class:locked={settings.entireGame}>
      <input
        type="checkbox"
        checked={settings.room46}
        disabled={settings.entireGame}
        onchange={(e) => toggle('room46', e.currentTarget.checked)}
      />
      <span>{settings.room46 ? 'Reached Room 46' : 'Opened Antechamber north door'}</span>
    </label>
    {/if}

    {#if settings.room46}
      <label class="row" class:locked={settings.entireGame}>
        <input
          type="checkbox"
          checked={settings.allRooms}
          disabled={settings.entireGame}
          onchange={(e) => toggle('allRooms', e.currentTarget.checked)}
        />
        <span>All rooms discovered</span>
      </label>

      <label class="row" class:locked={settings.entireGame}>
        <input
          type="checkbox"
          checked={settings.allItems}
          disabled={settings.entireGame}
          onchange={(e) => toggle('allItems', e.currentTarget.checked)}
        />
        <span>All items discovered</span>
      </label>

      <label class="row" class:locked={settings.entireGame}>
        <input
          type="checkbox"
          checked={settings.precipiceAccessed}
          disabled={settings.entireGame}
          onchange={(e) => toggle('precipiceAccessed', e.currentTarget.checked)}
        />
        <span>Blue flame puzzle solved</span>
      </label>

      {#if settings.precipiceAccessed}
        <label class="row indent-1" class:locked={settings.entireGame}>
          <input
            type="checkbox"
            checked={settings.precipiceSolved}
            disabled={settings.entireGame}
            onchange={(e) => toggle('precipiceSolved', e.currentTarget.checked)}
          />
          <span>Precipice puzzle solved</span>
        </label>
      {/if}

      <label class="row" class:locked={settings.entireGame}>
        <input
          type="checkbox"
          checked={settings.giftShop}
          disabled={settings.entireGame}
          onchange={(e) => toggle('giftShop', e.currentTarget.checked)}
        />
        <span>Alternate game modes unlocked</span>
      </label>
    {/if}
  {/if}

  <div class="divider"></div>

  {#if confirmingEntireGame}
    <div class="row confirm-row">
      <span class="confirm-msg">Reveal all endgame content?</span>
      <button class="confirm-yes" onclick={confirmEntireGame}>Yes</button>
      <button class="confirm-no" onclick={() => (confirmingEntireGame = false)}>Cancel</button>
    </div>
  {:else}
    <label class="row">
      <input
        type="checkbox"
        checked={settings.entireGame}
        onchange={(e) => toggle('entireGame', e.currentTarget.checked)}
      />
      <span>Entire game</span>
    </label>
  {/if}
</div>

<style>
  .spoiler-panel {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.875rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.1rem 0;
    cursor: pointer;
    user-select: none;
  }

  .row.locked {
    cursor: default;
    opacity: 0.55;
  }

  .indent-1 { padding-left: 1.25rem; }

  input[type='checkbox'] {
    flex-shrink: 0;
    width: 0.9rem;
    height: 0.9rem;
    cursor: inherit;
    accent-color: var(--accent, #3b82f6);
  }

  .divider {
    height: 1px;
    background: var(--border, rgba(128, 128, 128, 0.2));
    margin: 0.4rem 0;
  }

  .confirm-row {
    cursor: default;
    gap: 0.5rem;
  }

  .confirm-msg {
    font-size: 0.8rem;
    color: var(--text-muted, rgba(128, 128, 128, 0.8));
    flex: 1;
  }

  .confirm-yes,
  .confirm-no {
    padding: 0.15rem 0.6rem;
    font-size: 0.75rem;
    border: 1px solid var(--border, rgba(128, 128, 128, 0.3));
    border-radius: 3px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .confirm-yes:hover {
    background: var(--accent-light, rgba(59, 130, 246, 0.15));
    color: var(--accent, #3b82f6);
    border-color: var(--accent, #3b82f6);
  }

  .confirm-no:hover {
    background: var(--border, rgba(128, 128, 128, 0.15));
  }
</style>
