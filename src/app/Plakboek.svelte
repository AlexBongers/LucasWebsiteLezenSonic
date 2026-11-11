<script lang="ts">
  /**
   * Het plakboek: vier bladzijden (dieren, in huis, kleren en je lijf, buiten) met stickers.
   * Tik op een sticker en de stem zegt het woordje. Lege plekjes laten een schaduw zien van wat er nog komt.
   */
  import { onMount } from 'svelte';
  import StickerKaart from '../ui/StickerKaart.svelte';
  import BliksemTeller from '../ui/BliksemTeller.svelte';
  import { spreek, stopSpreken } from '../audio/stem';
  import { speelTik } from '../audio/geluid';
  import { BLADZIJDEN, ALLE_STICKERS } from '../games/stickers';
  import { aantalVan, aantalVerzameld, bladzijdeTelling, glimt, heeftSticker } from '../store/plakboek.svelte';
  import { vg } from '../store/voortgang.svelte';
  import teksten from '../../content/teksten.json';

  let { opSluit, opWinkel }: { opSluit: () => void; opWinkel: () => void } = $props();
  const pb = teksten.plakboek;
  const namen = pb.bladzijden as Record<string, string>;

  let blad = $state(BLADZIJDEN[0].id);
  let huidig = $derived(BLADZIJDEN.find((b) => b.id === blad)!);
  let tik: string | null = $state(null);
  // Elke plek een eigen schuine stand, zodat het echt geplakt lijkt.
  const kantel = (w: string) => ((w.charCodeAt(0) * 7 + w.length * 13) % 9) - 4;

  onMount(() => {
    void spreek(pb.welkom);
    return () => stopSpreken();
  });

  async function kiesBlad(id: string) {
    if (id === blad) return;
    speelTik();
    blad = id;
    await spreek(namen[id]);
  }

  async function tikSticker(w: string) {
    tik = w;
    setTimeout(() => (tik = null), 450);
    if (heeftSticker(w)) {
      speelTik();
      await spreek(w, 'woord');
    } else await spreek(pb.leeg);
  }
</script>

<div class="plakboek">
  <header>
    <button class="knop-rond" onclick={opSluit} aria-label="Terug">
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
        <path d="M15 5 L8 12 L15 19" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <h1>📒 Mijn plakboek</h1>
    <div class="telling">{aantalVerzameld()} / {ALLE_STICKERS.length}</div>
    <button class="winkel" onclick={opWinkel} aria-label="Stickers kopen in de winkel">🎁 Zakjes</button>
    <BliksemTeller aantal={vg.bliksems} klein />
  </header>

  <nav class="tabs">
    {#each BLADZIJDEN as b (b.id)}
      {@const t = bladzijdeTelling(b.id)}
      <button class="tab" class:aan={blad === b.id} class:vol={t.heeft === t.totaal} style="--kleur:{b.kleur}" onclick={() => kiesBlad(b.id)}>
        <span class="t-icoon">{b.icoon}</span>
        <span class="t-naam">{namen[b.id]}</span>
        <span class="t-tel">{t.heeft === t.totaal ? '⭐' : `${t.heeft}/${t.totaal}`}</span>
      </button>
    {/each}
  </nav>

  {#key blad}
    <section class="blad" style="--kleur:{huidig.kleur}">
      <div class="spiraal" aria-hidden="true">
        {#each Array.from({ length: 9 }) as _}<i></i>{/each}
      </div>
      <h2>{huidig.icoon} {namen[huidig.id]}</h2>
      <div class="raster">
        {#each huidig.woorden as w, i (w)}
          <button class="plek" class:tik={tik === w} style="animation-delay:{i * 0.03}s" onclick={() => tikSticker(w)} aria-label={heeftSticker(w) ? w : 'lege plek'}>
            <StickerKaart woord={w} leeg={!heeftSticker(w)} glim={glimt(w)} aantal={aantalVan(w)} grootte={134} kantel={kantel(w)} />
          </button>
        {/each}
      </div>
    </section>
  {/key}
</div>

<style>
  .plakboek {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 28px 20px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 50px;
    text-shadow: 0 3px 0 rgba(40, 10, 90, 0.6), 0 0 24px rgba(244, 114, 182, 0.7);
  }
  .telling {
    padding: 6px 20px;
    border-radius: 999px;
    font-size: 28px;
    font-weight: 700;
    background: rgba(0, 20, 70, 0.55);
    border: 2px solid rgba(255, 255, 255, 0.5);
  }
  .winkel {
    min-height: 56px;
    padding: 0 18px;
    border-radius: 999px;
    font-size: 24px;
    font-weight: 700;
    background: linear-gradient(180deg, #c4b5fd, #7c3aed);
    border: 3px solid #ede9fe;
    box-shadow: 0 5px 0 #3b0f7a;
  }
  .tabs {
    display: flex;
    gap: 12px;
  }
  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 64px;
    border-radius: 22px 22px 8px 8px;
    font-size: 24px;
    font-weight: 700;
    background: color-mix(in srgb, var(--kleur) 35%, #0b1a4a);
    border: 3px solid color-mix(in srgb, var(--kleur) 70%, white);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.3);
  }
  .tab.aan {
    background: linear-gradient(180deg, color-mix(in srgb, var(--kleur) 75%, white), var(--kleur));
    transform: translateY(4px);
  }
  .t-icoon {
    font-size: 32px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .t-tel {
    font-size: 20px;
    color: #fef9c3;
  }
  .blad {
    position: relative;
    flex: 1;
    min-height: 0;
    padding: 16px 30px 20px 76px;
    border-radius: 18px 30px 30px 18px;
    background:
      repeating-linear-gradient(0deg, transparent 0 38px, rgba(59, 130, 246, 0.08) 38px 40px),
      linear-gradient(180deg, #fffdf5, #fdf3d8);
    border-left: 14px solid var(--kleur);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), inset 0 0 40px rgba(180, 140, 60, 0.15);
    animation: blad-in 0.35s ease-out;
  }
  .spiraal {
    position: absolute;
    left: 14px;
    top: 24px;
    bottom: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .spiraal i {
    width: 34px;
    height: 18px;
    border-radius: 999px;
    border: 5px solid #94a3b8;
    background: #e2e8f0;
  }
  h2 {
    margin: 0 0 10px;
    font-size: 36px;
    color: color-mix(in srgb, var(--kleur) 70%, #1e293b);
    text-shadow: none;
  }
  .raster {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 22px;
  }
  .plek {
    padding: 0;
    background: none;
    border: 0;
    animation: pop-in 0.35s ease-out backwards;
  }
  .plek.tik {
    animation: wip 0.45s ease-out;
  }
  @keyframes wip {
    30% { transform: scale(1.15) rotate(-4deg); }
    60% { transform: scale(0.95) rotate(3deg); }
  }
  @keyframes blad-in {
    from { transform: rotateY(-12deg) translateX(-20px); opacity: 0; }
  }
</style>
