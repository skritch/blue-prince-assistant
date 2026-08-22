<script lang="ts">
  import PoolVIew from "./lib/components/PoolView.svelte";

  type Theme = 'system' | 'light' | 'dark';

  let theme: Theme = $state((localStorage.getItem('theme') as Theme | null) ?? 'system');

  $effect(() => {
    if (theme === 'system') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
    localStorage.setItem('theme', theme);
  });
</script>

<main>
  <header>
    <h1>Blue Prince Pool Assistant</h1>
  </header>
  <PoolVIew />
  <footer>
    <div class="theme-toggle" role="group" aria-label="Theme">
      {#each ([['system', '🖥️'], ['light', '☀️'], ['dark', '🌙']] as [Theme, string][]) as [t, icon]}
        <button
          class="theme-btn"
          class:active={theme === t}
          aria-label={t}
          onclick={() => (theme = t)}
        >{icon}</button>
      {/each}
    </div>
  </footer>
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
  }
  header {
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
  }
  h1 {
    font-size: 1.5rem;
    margin: 0.75rem 0;
  }
  footer {
    margin-top: 2rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
  }
  .theme-toggle {
    display: flex;
    gap: 2px;
  }
  .theme-btn {
    padding: 0.2rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    text-transform: capitalize;
  }
  .theme-btn:hover {
    background: var(--border);
    color: var(--text);
  }
  .theme-btn.active {
    background: var(--accent-light);
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
