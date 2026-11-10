<script lang="ts">
  /** Het maatje dat Lucas in de winkel heeft gekozen: een vrolijk beestje dat meekijkt. */
  import { vg } from '../store/voortgang.svelte';
  import { ARTIKEL } from '../games/winkel';

  let { grootte = 52, id }: { grootte?: number; id?: string } = $props();
  let a = $derived(ARTIKEL[id ?? vg.winkel.gekozen.maatje]);
</script>

{#if a}
  <span class="maatje" style="font-size:{grootte}px; --kleur:{a.kleur}" aria-hidden="true">{a.icoon}</span>
{/if}

<style>
  .maatje {
    display: inline-block;
    line-height: 1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
    filter: drop-shadow(0 0 10px var(--kleur));
    animation: huppel 1.6s ease-in-out infinite;
  }
  @keyframes huppel {
    0%, 100% { transform: translateY(0) rotate(-4deg); }
    40% { transform: translateY(-9px) rotate(5deg); }
    60% { transform: translateY(-9px) rotate(3deg); }
  }
</style>
