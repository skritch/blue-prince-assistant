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
  let selectedIndex = $state(-1);

  // Sync query with value changes (e.g., when cleared externally)
  $effect(() => {
    query = value ? (itemById[value]?.label ?? value) : "";
  });

  let matches = $derived(
    focused && query && !itemById[value]
      ? items
          .filter((i) => i.label.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 8)
      : [],
  );

  // Reset selected index when matches change
  $effect(() => {
    if (matches.length === 0) {
      selectedIndex = -1;
    } else if (selectedIndex >= matches.length) {
      selectedIndex = matches.length - 1;
    }
  });

  function pick(item: Item, shouldFocusNext = false) {
    value = item.id;
    query = item.label;
    selectedIndex = -1;

    if (shouldFocusNext) {
      // Focus next input element
      const input = document.activeElement as HTMLInputElement;
      const form = input?.form || input?.closest('form') || document;
      const inputs = Array.from(form.querySelectorAll('input, select, textarea, button'));
      const currentIndex = inputs.indexOf(input);
      const nextInput = inputs[currentIndex + 1] as HTMLElement;
      if (nextInput) {
        setTimeout(() => nextInput.focus(), 0);
      }
    }
  }

  function oninput() {
    value = "";
    selectedIndex = -1;
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      query = "";
      value = "";
      selectedIndex = -1;
      return;
    }

    if (matches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = selectedIndex < matches.length - 1 ? selectedIndex + 1 : 0;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : matches.length - 1;
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < matches.length) {
        pick(matches[selectedIndex]);
      } else if (matches.length > 0) {
        pick(matches[0]);
      }
    } else if (e.key === "Tab" && matches.length > 0) {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < matches.length) {
        pick(matches[selectedIndex], true);
      } else {
        pick(matches[0], true);
      }
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
      {#each matches as item, i}
        <li>
          <button
            type="button"
            class="dropdown-item"
            class:selected={i === selectedIndex}
            onmousedown={() => pick(item)}
            onmouseenter={() => (selectedIndex = i)}>{item.label}</button
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

  .dropdown-item:hover,
  .dropdown-item.selected {
    background: var(--accent-light);
  }
</style>
