<script lang="ts">
  /** Bliksemschichten waar Lucas voor spaart. Springt op als er een bij komt. */
  let { aantal, klein = false }: { aantal: number; klein?: boolean } = $props();
  let pop = $state(false);
  let vorige: number | null = null;
  $effect(() => {
    if (vorige !== null && aantal > vorige) {
      pop = false;
      requestAnimationFrame(() => (pop = true));
      setTimeout(() => (pop = false), 700);
    }
    vorige = aantal;
  });
</script>

<div class="bliksems" class:pop class:klein aria-label="{aantal} bliksems">
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <defs>
      <linearGradient id="bliksem-verloop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fffbe0" />
        <stop offset="0.5" stop-color="#fde047" />
        <stop offset="1" stop-color="#f59e0b" />
      </linearGradient>
    </defs>
    <path d="M23 2 L8 23 H18 L14 38 L32 15 H22 Z" fill="url(#bliksem-verloop)" stroke="#7c2d12" stroke-width="2.4" stroke-linejoin="round" />
    <path d="M21 6 L12 20" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.8" />
  </svg>
  <span>{aantal}</span>
</div>

<style>
  .bliksems {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 18px 6px 8px;
    border-radius: 999px;
    background: rgba(40, 20, 90, 0.6);
    border: 2px solid rgba(253, 224, 71, 0.7);
    box-shadow: 0 0 16px rgba(253, 224, 71, 0.35);
    font-size: 30px;
    font-weight: 700;
    color: #fde047;
  }
  svg {
    width: 44px;
    height: 44px;
    filter: drop-shadow(0 0 8px rgba(253, 224, 71, 0.9));
  }
  .klein {
    font-size: 24px;
    padding: 3px 14px 3px 6px;
  }
  .klein svg {
    width: 34px;
    height: 34px;
  }
  .pop svg {
    animation: pop-in 0.6s ease-out;
  }
</style>
