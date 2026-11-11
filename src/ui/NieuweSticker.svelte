<script lang="ts">
  /**
   * Een of meer nieuwe stickers onthullen: het zakje scheurt open, de stickers draaien om
   * en de stem vertelt wat Lucas heeft gekregen.
   */
  import { onMount } from 'svelte';
  import StickerKaart from './StickerKaart.svelte';
  import { spreek } from '../audio/stem';
  import { speelKoop, speelBliksem, speelTik } from '../audio/geluid';
  import { glitterOp } from './feest';
  import type { StickerWinst } from '../store/plakboek.svelte';
  import teksten from '../../content/teksten.json';

  let { winsten, opSluit, zakje = false }: { winsten: StickerWinst[]; opSluit: () => void; zakje?: boolean } = $props();
  let open = $state(0);
  let vakEl: HTMLElement | undefined = $state();
  let klaar = $state(false);
  const pb = teksten.plakboek;

  onMount(() => {
    let weg = false;
    void (async () => {
      if (zakje) await spreek(pb.zakje);
      for (let i = 0; i < winsten.length; i++) {
        if (weg) return;
        const w = winsten[i];
        open = i + 1;
        speelTik();
        setTimeout(speelKoop, 250);
        setTimeout(() => glitterOp(vakEl ?? null), 300);
        if (w.glim && !w.dubbel) await spreek(pb.glim);
        else if (w.nieuw) await spreek(pb.nieuw);
        await spreek(w.woord, 'woord');
        if (w.dubbel) {
          speelBliksem();
          await spreek(pb.dubbel);
        }
        if (w.bladzijdeVol) {
          speelBliksem();
          await spreek(pb.vol);
        }
      }
      klaar = true;
    })();
    return () => (weg = true);
  });
</script>

<div class="laag" role="dialog" aria-label="Nieuwe stickers">
  <div class="vak" bind:this={vakEl}>
    <h2 class="goudtekst">{winsten.length > 1 ? 'Nieuwe stickers!' : 'Nieuwe sticker!'}</h2>
    <div class="rij">
      {#each winsten as w, i}
        <div class="plek" class:open={i < open}>
          <div class="draai">
            <div class="voor"><StickerKaart woord={w.woord} glim={w.glim} grootte={170} kantel={(i - 1) * 4} /></div>
            <div class="achter" aria-hidden="true">📒</div>
          </div>
          {#if i < open}
            <span class="label">
              {#if w.dubbel}+1 ⚡ (dubbel){:else if w.glim}✨ Glimmer!{:else}Nieuw!{/if}
            </span>
          {/if}
        </div>
      {/each}
    </div>
    {#if winsten.some((w) => w.bladzijdeVol)}<p class="vol">⭐ Bladzijde vol! +5 ⚡</p>{/if}
    <button class="knop-goud" class:wacht={!klaar} onclick={opSluit}>Plak in je boek! 📒</button>
  </div>
</div>

<style>
  .laag {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    background: radial-gradient(circle, rgba(76, 29, 149, 0.85), rgba(15, 10, 50, 0.94));
    animation: in 0.3s ease-out;
  }
  .vak {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
  }
  h2 {
    margin: 0;
    font-size: 64px;
  }
  .rij {
    display: flex;
    gap: 36px;
    perspective: 900px;
  }
  .plek {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 200px;
  }
  .draai {
    position: relative;
    width: 180px;
    height: 200px;
    transform-style: preserve-3d;
    transition: transform 0.7s cubic-bezier(0.3, 1.4, 0.5, 1);
    transform: rotateY(180deg) scale(0.85);
  }
  .open .draai {
    transform: rotateY(0) scale(1);
  }
  .voor,
  .achter {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    backface-visibility: hidden;
  }
  .achter {
    transform: rotateY(180deg);
    border-radius: 30px;
    font-size: 90px;
    background: repeating-linear-gradient(45deg, #7c3aed 0 16px, #8b5cf6 16px 32px);
    border: 6px solid #fde68a;
    box-shadow: 0 0 30px rgba(167, 139, 250, 0.8);
  }
  .label {
    font-size: 28px;
    font-weight: 700;
    color: #fde68a;
    animation: pop-in 0.4s ease-out;
  }
  .vol {
    margin: 0;
    font-size: 34px;
    font-weight: 700;
    color: #fde047;
  }
  .wacht {
    opacity: 0.85;
  }
  @keyframes in {
    from { opacity: 0; }
  }
</style>
