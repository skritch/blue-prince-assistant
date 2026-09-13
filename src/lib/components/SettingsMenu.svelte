<script lang="ts">
  import type { SpoilerSettings } from '../spoilerSettings'
  import SpoilerSettingsPanel from './SpoilerSettingsPanel.svelte'

  type Theme = 'system' | 'light' | 'dark'

  let {
    settings = $bindable(),
    open = $bindable(),
    theme = $bindable(),
  }: { settings: SpoilerSettings; open: boolean; theme: Theme } = $props()

  function close() {
    open = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
  }

  const themes: [Theme, string, string][] = [
    ['system', '🖥️', 'System'],
    ['light', '☀️', 'Light'],
    ['dark', '🌙', 'Dark'],
  ]

  let confirmingReset = $state(false)

  function resetAll() {
    localStorage.clear()
    location.reload()
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_interactive_supports_focus -->
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Settings"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <button class="backdrop" onclick={close} aria-label="Close settings" tabindex="-1"></button>
    <div class="panel">
      <div class="menu-header">
        <h2 class="panel-title">Settings</h2>
        <button class="close-btn" onclick={close} aria-label="Close">✕</button>
      </div>
      <div class="panel-body">
        <section class="section left-section">
          <h3 class="section-title">Appearance</h3>
          <div class="theme-options">
            {#each themes as [t, icon, label]}
              <button
                class="theme-opt"
                class:active={theme === t}
                aria-label={label}
                onclick={() => (theme = t)}
              >{icon} {label}</button>
            {/each}
          </div>
          <div class="reset-area">
            {#if confirmingReset}
              <span class="reset-confirm-msg">Reset everything?</span>
              <button class="reset-yes" onclick={resetAll}>Yes</button>
              <button class="reset-no" onclick={() => (confirmingReset = false)}>Cancel</button>
            {:else}
              <button class="reset-btn" onclick={() => (confirmingReset = true)}>Reset all</button>
            {/if}
          </div>
        </section>

        <div class="col-divider"></div>

        <section class="section">
          <h3 class="section-title">Spoiler level</h3>
          <SpoilerSettingsPanel bind:settings />
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    cursor: default;
    z-index: 0;
  }

  @media (prefers-color-scheme: dark) {
    .backdrop {
      background: rgba(0, 0, 0, 0.5);
    }
  }

  :global([data-theme='dark']) .backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  .panel {
    position: relative;
    z-index: 1;
    background: var(--bg, #fff);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    min-width: 590px;
  }

  .menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .panel-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    line-height: 1;
  }

  .close-btn:hover {
    background: var(--border);
    color: var(--text);
  }

  .panel-body {
    padding: 1rem;
    display: flex;
    gap: 0;
    align-items: stretch;
  }

  .section {
    flex: 1;
  }

  .col-divider {
    width: 1px;
    background: var(--border);
    align-self: stretch;
    margin: 0 1rem;
    flex-shrink: 0;
  }

  .section-title {
    margin: 0 0 0.6rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .theme-options {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .theme-opt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.6rem;
    font-size: 0.875rem;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
  }

  .theme-opt:hover {
    background: var(--border);
    color: var(--text);
  }

  .theme-opt.active {
    background: var(--accent-light);
    color: var(--accent);
    border-color: var(--accent);
  }

  .left-section {
    display: flex;
    flex-direction: column;
  }

  .reset-area {
    margin-top: auto;
    padding-top: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .reset-btn {
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .reset-btn:hover {
    border-color: #ef4444;
    color: #ef4444;
  }

  .reset-confirm-msg {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .reset-yes,
  .reset-no {
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .reset-yes {
    border-color: #ef4444;
    color: #ef4444;
  }

  .reset-yes:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .reset-no:hover {
    background: var(--border);
  }
</style>
