<script lang="ts">
  /** Een turbokristal: een glinsterende edelsteen. `leeg` toont een stippellijn waar hij nog komt. */
  let { kleur = '#3b82f6', grootte = 60, leeg = false, gloed = true }: { kleur?: string; grootte?: number; leeg?: boolean; gloed?: boolean } = $props();
  const id = `k${Math.random().toString(36).slice(2, 8)}`;
</script>

<svg viewBox="0 0 60 70" width={grootte} height={grootte * 1.16} class:gloed={gloed && !leeg} aria-hidden="true" style="--kleur:{kleur}">
  {#if leeg}
    <path d="M30 4 L52 22 L44 62 L16 62 L8 22 Z" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.45)" stroke-width="3" stroke-dasharray="5 5" stroke-linejoin="round" />
  {:else}
    <defs>
      <linearGradient id="{id}-a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.9" />
        <stop offset="0.35" stop-color={kleur} />
        <stop offset="1" stop-color={kleur} stop-opacity="0.55" />
      </linearGradient>
    </defs>
    <path d="M30 4 L52 22 L44 62 L16 62 L8 22 Z" fill="url(#{id}-a)" stroke="#0a1540" stroke-width="3.5" stroke-linejoin="round" />
    <path d="M8 22 L52 22 M30 4 L22 22 L30 62 L38 22 Z M22 22 L16 62 M38 22 L44 62" stroke="#fff" stroke-opacity="0.55" stroke-width="1.8" fill="none" stroke-linejoin="round" />
    <path d="M30 4 L22 22 L30 62 Z" fill="#fff" opacity="0.18" />
    <path d="M14 20 L22 10" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.9" />
  {/if}
</svg>

<style>
  svg {
    overflow: visible;
  }
  .gloed {
    filter: drop-shadow(0 0 8px var(--kleur)) drop-shadow(0 0 16px var(--kleur));
  }
</style>
