<script lang="ts">
  /** Gouden ringen, met een sprongetje als er bij komen. */
  let { aantal }: { aantal: number } = $props();
  let pop = $state(false);
  let vorige: number | null = null;
  $effect(() => {
    if (vorige !== null && aantal > vorige) {
      pop = false;
      requestAnimationFrame(() => (pop = true));
      setTimeout(() => (pop = false), 600);
    }
    vorige = aantal;
  });
</script>

<div class="ringen" class:pop aria-label="{aantal} gouden ringen">
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <linearGradient id="ring-goud" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff7c2" />
        <stop offset="0.5" stop-color="#fbbf24" />
        <stop offset="1" stop-color="#b45309" />
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="15" fill="none" stroke="url(#ring-goud)" stroke-width="8" />
    <circle cx="20" cy="20" r="15" fill="none" stroke="#fff7c2" stroke-width="1.5" opacity="0.8" />
    <path d="M9 14 A13 13 0 0 1 17 8" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.9" />
  </svg>
  <span>{aantal}</span>
</div>

<style>
  .ringen {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 18px 6px 6px;
    border-radius: 999px;
    background: rgba(0, 20, 70, 0.55);
    border: 2px solid rgba(253, 230, 138, 0.6);
    font-size: 30px;
    font-weight: 700;
    color: #fde68a;
  }
  svg {
    width: 44px;
    height: 44px;
  }
  .pop svg {
    animation: pop-in 0.5s ease-out;
  }
</style>
