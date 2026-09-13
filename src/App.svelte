<script lang="ts">
  import PoolVIew from "./lib/components/PoolView.svelte";
  import SpoilerSettingsPanel from "./lib/components/SpoilerSettingsPanel.svelte";
  import SettingsMenu from "./lib/components/SettingsMenu.svelte";
  import {
    loadSpoilerSettings,
    saveSpoilerSettings,
    type SpoilerSettings,
  } from "./lib/spoilerSettings";

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

  let spoilerSettings: SpoilerSettings = $state(loadSpoilerSettings());

  $effect(() => {
    saveSpoilerSettings($state.snapshot(spoilerSettings) as SpoilerSettings);
  });

  let showSpoilerWarning = $state(
    localStorage.getItem("spoiler-dismissed") !== "true",
  );

  function dismissSpoilerWarning() {
    localStorage.setItem("spoiler-dismissed", "true");
    showSpoilerWarning = false;
  }

  let settingsOpen = $state(false);

  let poolViewError = $state<Error | null>(null);
  let poolViewReset: (() => void) | null = null;

  function handlePoolError(error: unknown, reset: () => void) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[bp-drafter] PoolView render error:", err);
    poolViewError = err;
    poolViewReset = reset;
  }

  function resetFromError() {
    localStorage.removeItem("bp-drafter-state");
    history.replaceState(null, "", location.pathname + location.search);
    poolViewError = null;
    poolViewReset?.();
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
      <div class="spoiler-settings-wrap">
        <p class="settings-label">What have you seen?</p>
        <SpoilerSettingsPanel bind:settings={spoilerSettings} />
      </div>
      <button class="continue-btn" onclick={dismissSpoilerWarning}
        >Continue</button
      >
    </div>
  </div>
{/if}

<SettingsMenu
  bind:settings={spoilerSettings}
  bind:open={settingsOpen}
  bind:theme
/>

<main class:blurred={showSpoilerWarning}>
  <header>
    <div class="title-block">
      <h1>
        <span class="title-blue">BLUE</span>
        <span class="title-white">PRINCE</span>
      </h1>
      <p class="subtitle">draft calculator</p>
    </div>
    <div class="header-actions">
      <button
        class="settings-btn"
        onclick={() => (settingsOpen = !settingsOpen)}
        aria-label="Settings"
        aria-expanded={settingsOpen}
      >
        <svg
          viewBox="0 0 20 20"
          width="15"
          height="15"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  </header>
  <svelte:boundary onerror={handlePoolError}>
    <PoolVIew bind:spoilerSettings />
  </svelte:boundary>
  {#if poolViewError}
    <div class="error-panel">
      <p class="error-msg">Something went wrong.</p>
      <p class="error-detail">{poolViewError.message}</p>
      <button class="error-reset-btn" onclick={resetFromError}>
        Reset to defaults and try again
      </button>
    </div>
  {/if}
  {#if githubUrl}
    <footer>
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
    </footer>
  {/if}
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
    background: #111827;
    color: #f9fafb;
    /* Set CSS vars for SpoilerSettingsPanel in this dark context */
    --text: #f9fafb;
    --text-muted: rgba(249, 250, 251, 0.55);
    --border: rgba(249, 250, 251, 0.2);
    --accent: rgb(70, 184, 248);
    --accent-light: rgba(70, 184, 248, 0.15);
  }

  .spoiler-settings-wrap {
    text-align: left;
    width: 100%;
  }

  .settings-label {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(249, 250, 251, 0.55);
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
      --text: #111827;
      --text-muted: rgba(17, 24, 39, 0.55);
      --border: rgba(17, 24, 39, 0.2);
      --accent: hsl(202 90% 40% / 1);
      --accent-light: hsl(202 90% 40% / 0.12);
    }
    .settings-label {
      color: rgba(17, 24, 39, 0.55);
    }
  }

  :global(html[data-theme="dark"]) .spoiler-overlay {
    background: rgba(255, 255, 255, 0.5);
  }
  :global(html[data-theme="dark"]) .spoiler-content {
    background: #f9fafb;
    color: #111827;
    --text: #111827;
    --text-muted: rgba(17, 24, 39, 0.55);
    --border: rgba(17, 24, 39, 0.2);
    --accent: hsl(202 90% 40% / 1);
    --accent-light: hsl(202 90% 40% / 0.12);
  }
  :global(html[data-theme="dark"]) .settings-label {
    color: rgba(17, 24, 39, 0.55);
  }

  :global(html[data-theme="light"]) .spoiler-overlay {
    background: rgba(0, 0, 0, 0.6);
  }
  :global(html[data-theme="light"]) .spoiler-content {
    background: #111827;
    color: #f9fafb;
    --text: #f9fafb;
    --text-muted: rgba(249, 250, 251, 0.55);
    --border: rgba(249, 250, 251, 0.2);
    --accent: rgb(70, 184, 248);
    --accent-light: rgba(70, 184, 248, 0.15);
  }
  :global(html[data-theme="light"]) .settings-label {
    color: rgba(249, 250, 251, 0.55);
  }

  header {
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
    line-height: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }

  .title-block {
    display: inline-block;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.6rem;
  }

  .settings-btn {
    padding: 0.25rem 0.65rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .settings-btn:hover,
  .settings-btn[aria-expanded="true"] {
    background: var(--border);
    color: var(--text);
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
  .error-panel {
    margin-top: 2rem;
    padding: 1.5rem 2rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .error-msg {
    margin: 0;
    font-weight: 600;
    color: var(--text);
  }

  .error-detail {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-muted);
    font-family: monospace;
    word-break: break-all;
  }

  .error-reset-btn {
    padding: 0.4rem 1rem;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .error-reset-btn:hover {
    background: var(--border);
  }

  footer {
    margin-top: 2rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
  }
  .github-link {
    color: var(--text-muted);
    display: flex;
    align-items: center;
  }
  .github-link:hover {
    color: var(--text);
  }
</style>
