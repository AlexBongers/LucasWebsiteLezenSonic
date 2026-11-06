<script lang="ts">
  /** Tekstballon boven een heldin: laat zien wat de stem zegt (meelezen!). */
  import { onMount } from 'svelte';
  import { luisterNaarStem } from '../audio/stem';
  import type { Spreeksoort } from '../audio/hash';

  let { kleur = '#3b82f6', soorten = ['instructie'] }: { kleur?: string; soorten?: Spreeksoort[] } = $props();

  let tekst: string | null = $state(null);
  let teller = $state(0);
  let verberg: ReturnType<typeof setTimeout> | undefined;

  onMount(() =>
    luisterNaarStem((t, soort) => {
      clearTimeout(verberg);
      if (t && soorten.includes(soort)) {
        tekst = t;
        teller++;
      } else if (!t) {
        verberg = setTimeout(() => (tekst = null), 1400);
      }
    }),
  );
</script>

{#if tekst}
  {#key teller}
    <div class="ballon" style="--kleur:{kleur}">{tekst}</div>
  {/key}
{/if}

<style>
  .ballon {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: calc(100% + 4px);
    z-index: 5;
    padding: 12px 16px;
    border-radius: 22px;
    background: #fff;
    color: var(--inkt);
    font-family: var(--font-lees);
    font-size: 22px;
    font-weight: 700;
    line-height: 1.3;
    text-align: center;
    border: 3px solid var(--kleur);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 18px color-mix(in srgb, var(--kleur) 50%, transparent);
    animation: ballon-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: 50% 100%;
  }
  .ballon::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -14px;
    width: 22px;
    height: 22px;
    background: #fff;
    border-right: 3px solid var(--kleur);
    border-bottom: 3px solid var(--kleur);
    transform: translateX(-50%) rotate(45deg);
    border-bottom-right-radius: 5px;
  }
  @keyframes ballon-in {
    from { transform: scale(0.3); opacity: 0; }
  }
</style>
