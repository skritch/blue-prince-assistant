<script lang="ts">
  import PoolVIew from "./lib/components/PoolView.svelte";
</script>

<main>
  <header>
    <h1>Blue Prince Pool Assistant</h1>
  </header>
  <PoolVIew />
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
</style>
