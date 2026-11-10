<script lang="ts">
  /** De powerups die Lucas heeft gekocht, als knoppen bovenin het spel. Tik om er een aan te zetten. */
  import { vg } from '../store/voortgang.svelte';
  import { uitrusting } from '../games/uitrusting.svelte';
  import { ARTIKELEN } from '../games/winkel';

  let { opGebruik }: { opGebruik: (id: string) => void } = $props();
  const power = ARTIKELEN.filter((a) => a.soort === 'power');
  const actief = (id: string) => (id === 'hart' ? uitrusting.hart : id === 'dubbel' ? +uitrusting.dubbel : id === 'traag' ? +uitrusting.traag : 0);
</script>

<div class="uitrusting">
  {#each power as a (a.id)}
    {@const n = vg.winkel.voorraad[a.id] ?? 0}
    {@const aan = actief(a.id)}
    {#if n > 0 || aan > 0}
      <button class="chip" class:aan={aan > 0} style="--kleur:{a.kleur}" disabled={n === 0} onclick={() => opGebruik(a.id)} aria-label="{a.id} {n} over">
        <span class="icoon">{a.icoon}</span>
        {#if aan > 0}
          <span class="stand">{a.id === 'hart' ? `×${aan}` : 'aan'}</span>
        {:else}
          <span class="aantal">{n}</span>
        {/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .uitrusting {
    display: flex;
    gap: 10px;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 52px;
    padding: 4px 14px 4px 10px;
    border-radius: 999px;
    font-size: 24px;
    font-weight: 700;
    background: rgba(0, 20, 70, 0.55);
    border: 3px solid color-mix(in srgb, var(--kleur) 75%, white);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }
  .chip:active:not(:disabled) {
    transform: translateY(3px);
  }
  .chip.aan {
    background: linear-gradient(180deg, color-mix(in srgb, var(--kleur) 85%, white), var(--kleur));
    box-shadow: 0 0 22px var(--kleur), 0 4px 0 rgba(0, 0, 0, 0.3);
    animation: puls 1.4s ease-in-out infinite;
  }
  .chip:disabled {
    opacity: 1;
  }
  .icoon {
    font-size: 30px;
    line-height: 1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .aantal {
    min-width: 20px;
    text-align: center;
    color: #fde68a;
  }
  .stand {
    font-size: 20px;
    color: #fff;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }
</style>
