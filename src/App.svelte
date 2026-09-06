<script lang="ts">
  import PoolVIew from "./lib/components/PoolView.svelte";

  type Theme = "system" | "light" | "dark";

  let theme: Theme = $state(
    (localStorage.getItem("theme") as Theme | null) ?? "system",
  );

  $effect(() => {
    if (theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
    localStorage.setItem("theme", theme);
  });

  const githubUrl =
    window.location.hostname === "skritch.github.io"
      ? "https://github.com/skritch/blue-prince-assistant"
      : null;

  let showSpoilerWarning = $state(
    localStorage.getItem("spoiler-dismissed") !== "true",
  );

  function dismissSpoilerWarning() {
    localStorage.setItem("spoiler-dismissed", "true");
    showSpoilerWarning = false;
  }
</script>

{#if showSpoilerWarning}
  <div
    class="spoiler-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Spoiler warning"
  >
    <div class="spoiler-content">
      <p class="spoiler-text">
        <span class="game-title">Blue Prince</span> spoilers within...
      </p>
      <button class="continue-btn" onclick={dismissSpoilerWarning}
        >Continue</button
      >
    </div>
  </div>
{/if}

<main class:blurred={showSpoilerWarning}>
  <header>
    <div class="title-block">
      <h1>
        <span class="title-blue">BLUE</span>
        <span class="title-white">PRINCE</span>
      </h1>
      <p class="subtitle">drafting simulator</p>
    </div>
  </header>
  <PoolVIew />
  <footer>
    <div>
      {#if githubUrl}
        <a
          class="github-link"
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
        >
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </a>
      {/if}
    </div>
    <div class="theme-toggle" role="group" aria-label="Theme">
      {#each [["system", "🖥️"], ["light", "☀️"], ["dark", "🌙"]] as [Theme, string][] as [t, icon]}
        <button
          class="theme-btn"
          class:active={theme === t}
          aria-label={t}
          onclick={() => (theme = t)}>{icon}</button
        >
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

  main.blurred {
    filter: blur(6px);
    pointer-events: none;
    user-select: none;
  }

  .spoiler-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    /* light mode default: dark overlay */
    background: rgba(0, 0, 0, 0.6);
  }

  .spoiler-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 2.5rem 3rem;
    border-radius: 8px;
    text-align: center;
    /* light mode: dark card */
    background: #111827;
    color: #f9fafb;
  }

  .spoiler-text {
    font-size: 1.25rem;
    font-weight: 500;
    margin: 0;
    line-height: 1.5;
  }

  .game-title {
    color: rgb(70, 184, 248);
    font-weight: 700;
  }

  .continue-btn {
    padding: 0.5rem 1.5rem;
    border-radius: 5px;
    border: 1px solid rgba(70, 184, 248, 0.5);
    background: transparent;
    color: rgb(70, 184, 248);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.03em;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .continue-btn:hover {
    background: rgba(70, 184, 248, 0.15);
  }

  /* dark mode: light overlay */
  @media (prefers-color-scheme: dark) {
    .spoiler-overlay {
      background: rgba(255, 255, 255, 0.5);
    }
    .spoiler-content {
      background: #f9fafb;
      color: #111827;
    }
  }

  :global(html[data-theme="dark"]) .spoiler-overlay {
    background: rgba(255, 255, 255, 0.5);
  }
  :global(html[data-theme="dark"]) .spoiler-content {
    background: #f9fafb;
    color: #111827;
  }

  :global(html[data-theme="light"]) .spoiler-overlay {
    background: rgba(0, 0, 0, 0.6);
  }
  :global(html[data-theme="light"]) .spoiler-content {
    background: #111827;
    color: #f9fafb;
  }

  header {
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
    line-height: 1;
  }
  .title-block {
    display: inline-block;
  }
  h1 {
    font-size: 1.9rem;
    font-weight: 900;
    letter-spacing: 0.05em;
    margin: 0.5rem 0 0;
    line-height: 1;
  }
  .title-blue {
    color: hsl(202 90% 47% / 1);
    -webkit-text-stroke: 2px black;
    paint-order: stroke fill;
  }
  .title-white {
    color: white;
    -webkit-text-stroke: 2px black;
    paint-order: stroke fill;
  }
  .subtitle {
    font-family: "dArchitect", "Architects Daughter", cursive;
    font-size: 1.25rem;
    letter-spacing: 0.15em;
    margin: 0.15rem 0 0.6rem;
    color: var(--text);
    font-weight: 500;
    text-align: center;
  }
  footer {
    margin-top: 2rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .github-link {
    color: var(--text-muted);
    display: flex;
    align-items: center;
  }
  .github-link:hover {
    color: var(--text);
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
