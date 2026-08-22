<script module lang="ts">
  export type { Item, Entry } from "./searchPairTypes";
</script>

<script lang="ts">
  import type { Item, Entry } from "./searchPairTypes";
  let {
    label,
    searchItems,
    secondOptions,
    entries,
    onadd,
    onremove,
  }: {
    label: string;
    searchItems: Item[];
    secondOptions?: (keyId: string) => Item[];
    entries: Entry[];
    onadd: (keyId: string, valueId?: string) => void;
    onremove: (index: number) => void;
  } = $props();

  let query = $state("");
  let pendingKey = $state<Item | null>(null);
  let pendingValue = $state("");
  let focused = $state(false);

  let matches = $derived(
    focused && query && !pendingKey
      ? searchItems
          .filter((i) => i.label.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 8)
      : [],
  );

  let valueOptions = $derived(
    pendingKey && secondOptions ? secondOptions(pendingKey!.id) : [],
  );

  function pick(item: Item) {
    pendingKey = item;
    query = item.label;
    if (!secondOptions) {
      onadd(item.id);
      query = "";
      pendingKey = null;
    }
  }

  function pickValue(valueId: string) {
    if (!pendingKey || !valueId) return;
    onadd(pendingKey.id, valueId);
    query = "";
    pendingKey = null;
    pendingValue = "";
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      query = "";
      pendingKey = null;
      pendingValue = "";
    }
  }
</script>

<details class="wrap">
  <summary class="header">{label}</summary>
  <div class="body">
    <div class="input-row">
      <div class="search-wrap">
        <input
          class="text-input"
          type="text"
          bind:value={query}
          onfocus={() => (focused = true)}
          onblur={() => setTimeout(() => (focused = false), 150)}
          oninput={() => {
            pendingKey = null;
            pendingValue = "";
          }}
          {onkeydown}
          placeholder="Search rooms..."
        />
        {#if matches.length > 0}
          <ul class="dropdown">
            {#each matches as item}
              <li>
                <button
                  type="button"
                  class="dropdown-item"
                  onmousedown={() => pick(item)}
                >
                  {item.label}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      {#if secondOptions}
        <select
          class="value-select"
          value=""
          disabled={!pendingKey}
          onchange={(e) => pickValue(e.currentTarget.value)}
        >
          <option value="">—</option>
          {#each valueOptions as opt}
            <option value={opt.id}>{opt.label}</option>
          {/each}
        </select>
      {/if}
    </div>

    {#if entries.length > 0}
      <ul class="entry-list">
        {#each entries as entry, i}
          <li class="entry">
            <span class="entry-label">
              {entry.keyLabel}{entry.valueLabel ? ` → ${entry.valueLabel}` : ""}
            </span>
            <button type="button" class="remove-btn" onclick={() => onremove(i)}
              >×</button
            >
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</details>

<style>
  .wrap {
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  .header {
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
    list-style: none;
  }

  .header::before {
    content: "▶";
    display: inline-block;
    margin-right: 0.4rem;
    font-size: 0.6rem;
    transition: transform 0.15s;
  }

  details[open] .header::before {
    transform: rotate(90deg);
  }

  .body {
    padding: 0.5rem 0.6rem;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .input-row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .text-input {
    width: 100%;
    padding: 0.25rem 0.4rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
    color: var(--text);
    box-sizing: border-box;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 3px;
    margin: 0;
    padding: 0.2rem 0;
    list-style: none;
    z-index: 20;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  }

  .dropdown li {
    padding: 0;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    text-align: left;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
  }

  .dropdown-item:hover {
    background: var(--accent-light);
  }

  .value-select {
    padding: 0.25rem 0.3rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
    color: var(--text);
    min-width: 8rem;
  }

  .value-select:disabled {
    opacity: 0.5;
  }

  .add-btn {
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--accent-light);
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
  }

  .add-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .add-btn:not(:disabled):hover {
    border-color: var(--accent);
  }

  .entry-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8rem;
    gap: 0.4rem;
  }

  .entry-label {
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1rem;
    padding: 0 0.1rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    color: var(--text);
  }
</style>
