<script lang="ts">
  type Item = { id: string; label: string };

  let {
    items,
    value = $bindable(""),
    placeholder = "Search...",
  }: {
    items: Item[];
    value?: string;
    placeholder?: string;
  } = $props();

  const itemById = $derived(Object.fromEntries(items.map((i) => [i.id, i])));

  let query = $state(value ? (itemById[value]?.label ?? value) : "");
  let focused = $state(false);

  let matches = $derived(
    focused && query && !itemById[value]
      ? items
          .filter((i) => i.label.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 8)
      : [],
  );

  function pick(item: Item) {
    value = item.id;
    query = item.label;
  }

  function oninput() {
    value = "";
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      query = "";
      value = "";
    }
  }
</script>

<div class="search-wrap">
  <input
    class="text-input"
    type="text"
    bind:value={query}
    onfocus={() => (focused = true)}
    onblur={() => setTimeout(() => (focused = false), 150)}
    {oninput}
    {onkeydown}
    {placeholder}
  />
  {#if matches.length > 0}
    <ul class="dropdown">
      {#each matches as item}
        <li>
          <button
            type="button"
            class="dropdown-item"
            onmousedown={() => pick(item)}>{item.label}</button
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search-wrap {
    position: relative;
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
</style>
