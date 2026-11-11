<script lang="ts">
  /**
   * De kleedkamer: Lucas kiest een held en kleedt hem aan met hoeden, brillen, schoenen en spullen op de rug.
   * Tik op iets om het eerst te passen; kopen gaat met gouden ringen, daarna kan het bij elke held aan en uit.
   */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import RingTeller from '../ui/RingTeller.svelte';
  import RingPrijs from '../ui/RingPrijs.svelte';
  import { spreekbaarBedrag } from '../games/geld';
  import { spreek, stopSpreken } from '../audio/stem';
  import { speelBijna, speelKoop, speelTik } from '../audio/geluid';
  import { glitterOp } from '../ui/feest';
  import { PLEKKEN, KLEDINGSTUK, kledingVoor, type KledingStuk, type Plek } from '../games/kleding';
  import type { HeldId } from '../games/spellen';
  import { uitZak } from '../games/teksten';
  import { heeftKleding, koopKleding, wisselKleding } from '../store/kleedkamer.svelte';
  import { vg } from '../store/voortgang.svelte';
  import characters from '../../content/characters.json';
  import teksten from '../../content/teksten.json';

  let { opSluit }: { opSluit: () => void } = $props();
  const kk = teksten.kleedkamer;
  const w = teksten.winkel;
  const naam = (id: string) => (kk.stuks as Record<string, string>)[id];

  let wie: HeldId = $state('sonic');
  let plek: Plek = $state('hoofd');
  let pas: string | null = $state(null);
  let juich = $state(false);
  let paspopEl: HTMLElement | undefined = $state();
  let beurt = 0;

  let aan = $derived(vg.winkel.kleding[wie]);
  /** Wat de held op de paspop draagt: zijn eigen kleding plus wat Lucas nu past. */
  let paskleding = $derived(pas ? { ...aan, [KLEDINGSTUK[pas].plek]: pas } : aan);
  let gekozen = $derived(pas ? KLEDINGSTUK[pas] : null);

  onMount(() => {
    void spreek(kk.welkom);
    return () => {
      beurt++;
      stopSpreken();
    };
  });

  function kiesHeld(h: HeldId) {
    speelTik();
    wie = h;
    pas = null;
    void spreek(characters[h].naam);
  }

  function kiesPlek(p: Plek) {
    speelTik();
    plek = p;
    pas = null;
    void spreek((kk.plekken as Record<string, string>)[p]);
  }

  async function zegPrijs(prijs: number, mijn: number) {
    await spreek(w.kost);
    if (mijn !== beurt) return;
    await spreek(String(prijs), 'getal');
    if (mijn !== beurt) return;
    await spreek(w.ringen);
  }

  async function tik(k: KledingStuk) {
    const mijn = ++beurt;
    speelTik();
    if (heeftKleding(k.id)) {
      pas = null;
      const nuAan = wisselKleding(k.id, wie);
      if (nuAan) {
        vier();
        await spreek(naam(k.id));
        if (mijn === beurt) await spreek(uitZak('kleding-aan', kk.aan));
      } else await spreek(kk.uit);
      return;
    }
    pas = k.id;
    await spreek(naam(k.id));
    if (mijn !== beurt) return;
    await spreek(kk.passen);
    if (mijn !== beurt) return;
    await zegPrijs(k.prijs, mijn);
  }

  function vier() {
    juich = true;
    setTimeout(() => (juich = false), 1400);
    glitterOp(paspopEl ?? null);
  }

  async function koop() {
    if (!gekozen) return;
    const k = gekozen;
    const mijn = ++beurt;
    const uit = koopKleding(k.id, wie);
    if (uit === 'te-weinig') {
      speelBijna();
      const nog = k.prijs - vg.ringen;
      const bedrag = spreekbaarBedrag(nog);
      if (nog <= 1) await spreek(w.nogEen);
      else if (!bedrag) await spreek(w.sparen);
      else {
        await spreek(w.nog);
        if (mijn !== beurt) return;
        await spreek(bedrag, 'getal');
        if (mijn !== beurt) return;
        await spreek(w.nogSparen);
      }
      return;
    }
    pas = null;
    speelKoop();
    vier();
    await spreek(uitZak('gekocht', w.gekocht));
    if (mijn === beurt) await spreek(uitZak('kleding-aan', kk.aan));
  }
</script>

<div class="kleedkamer">
  <header>
    <button class="knop-rond" onclick={opSluit} aria-label="Terug">
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
        <path d="M15 5 L8 12 L15 19" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <h1>👕 Kleedkamer</h1>
    <RingTeller aantal={vg.ringen} />
  </header>

  <div class="midden">
    <section class="paspop" style="--kleur:{characters[wie].kleur}" bind:this={paspopEl}>
      <div class="spot" aria-hidden="true"></div>
      <div class="figuur">
        <Held {wie} kleding={paskleding} stemming={juich ? 'juich' : 'rust'} hoogte={420} />
      </div>
      {#if pas}<div class="past">Aan het passen ✨</div>{/if}
      <div class="helden">
        {#each ['sonic', 'tails', 'knuckles'] as const as h}
          <button class="heldknop" class:aan={wie === h} style="--kleur:{characters[h].kleur}" onclick={() => kiesHeld(h)} aria-label={characters[h].naam}>
            <Held wie={h} hoogte={70} />
          </button>
        {/each}
      </div>
    </section>

    <section class="kast">
      <nav class="plekken">
        {#each PLEKKEN as p (p.plek)}
          <button class="plek" class:aan={plek === p.plek} onclick={() => kiesPlek(p.plek)}>
            <span class="p-icoon" aria-label={(kk.plekken as Record<string, string>)[p.plek]}>{p.icoon}</span>
          </button>
        {/each}
      </nav>

      <div class="rek">
        {#each kledingVoor(plek) as k (k.id)}
          {@const bezit = heeftKleding(k.id)}
          {@const draagt = aan[k.plek] === k.id}
          <button class="stuk" class:draagt class:pas={pas === k.id} style="--kleur:{k.kleur}" onclick={() => tik(k)}>
            <span class="s-icoon" class:schoenkleur={k.plek === 'schoen'} style="--k:{k.id === 'regenboogschoenen' ? 'conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)' : k.kleur}">{k.icoon}</span>
            <span class="s-naam">{naam(k.id)}</span>
            {#if draagt}
              <span class="label aan">✔ Aan</span>
            {:else if bezit}
              <span class="label">Van jou</span>
            {:else}
              <RingPrijs prijs={k.prijs} duur={vg.ringen < k.prijs} />
            {/if}
          </button>
        {/each}
      </div>

      <div class="balk">
        {#if gekozen}
          <span class="b-tekst">{gekozen.icoon} {naam(gekozen.id)}</span>
          <button class="knop-rond nee" onclick={() => (pas = null)} aria-label="Niet kopen">✕</button>
          <button class="knop-goud" class:duur={vg.ringen < gekozen.prijs} onclick={koop} aria-label="Kopen"><span class="groot-icoon">🛒</span> <RingPrijs prijs={gekozen.prijs} /></button>
        {:else}
          <span class="b-tekst zacht groot-icoon">👆 👕</span>
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  .kleedkamer {
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
    gap: 20px;
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 52px;
    text-shadow: 0 3px 0 rgba(40, 10, 90, 0.6), 0 0 24px rgba(96, 165, 250, 0.8);
  }
  .midden {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 430px 1fr;
    gap: 22px;
  }
  .paspop {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 10px 10px 16px;
    border-radius: 34px;
    background: radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--kleur) 45%, transparent), rgba(6, 18, 58, 0.75) 72%);
    border: 4px solid color-mix(in srgb, var(--kleur) 70%, white);
    overflow: hidden;
  }
  .spot {
    position: absolute;
    left: 50%;
    bottom: 96px;
    width: 300px;
    height: 46px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(255, 255, 255, 0.45), transparent 70%);
  }
  .figuur {
    position: relative;
  }
  .past {
    position: absolute;
    top: 14px;
    padding: 4px 16px;
    border-radius: 999px;
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(90deg, #f472b6, #a855f7);
    animation: pop-in 0.3s ease-out;
  }
  .helden {
    display: flex;
    gap: 14px;
  }
  .heldknop {
    width: 84px;
    height: 84px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(0, 20, 70, 0.6);
    border: 4px solid rgba(255, 255, 255, 0.35);
    overflow: hidden;
  }
  .heldknop.aan {
    border-color: #fde68a;
    background: color-mix(in srgb, var(--kleur) 60%, #0b1a4a);
    box-shadow: 0 0 20px var(--kleur);
  }
  .kast {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .plekken {
    display: flex;
    gap: 10px;
  }
  .plek {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 64px;
    border-radius: 22px;
    font-size: 24px;
    font-weight: 700;
    background: rgba(0, 20, 70, 0.5);
    border: 3px solid rgba(255, 255, 255, 0.35);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.3);
  }
  .plek.aan {
    background: linear-gradient(180deg, #fde68a, #f59e0b);
    color: #3b1d00;
    border-color: #fff7c2;
  }
  .groot-icoon {
    font-size: 44px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .p-icoon {
    font-size: 42px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .rek {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    justify-content: center;
    gap: 16px;
  }
  .stuk {
    width: 196px;
    height: 196px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 12px 8px 10px;
    border-radius: 26px;
    background: radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--kleur) 40%, transparent), transparent 75%), rgba(10, 20, 80, 0.55);
    border: 4px solid color-mix(in srgb, var(--kleur) 60%, white);
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.3);
    animation: pop-in 0.35s ease-out backwards;
  }
  .stuk.pas {
    border-color: #f9a8d4;
    box-shadow: 0 0 26px #f472b6, 0 6px 0 rgba(0, 0, 0, 0.3);
    transform: translateY(-5px);
  }
  .stuk.draagt {
    border-color: #86efac;
    box-shadow: 0 0 22px rgba(74, 222, 128, 0.8), 0 6px 0 rgba(0, 0, 0, 0.3);
  }
  .s-icoon {
    font-size: 72px;
    line-height: 1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .schoenkleur {
    display: grid;
    place-items: center;
    width: 92px;
    height: 92px;
    border-radius: 50%;
    font-size: 58px;
    background: var(--k);
    border: 4px solid #fff;
  }
  .s-naam {
    font-size: 22px;
    font-weight: 700;
    text-align: center;
    line-height: 1.1;
  }
  .label {
    font-size: 20px;
    font-weight: 700;
    color: #bbf7d0;
  }
  .duur {
    filter: grayscale(0.8) brightness(0.85);
  }
  .balk {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 88px;
    padding: 8px 20px;
    border-radius: 26px;
    background: rgba(6, 18, 58, 0.8);
    border: 3px solid rgba(255, 255, 255, 0.3);
  }
  .b-tekst {
    flex: 1;
    font-size: 30px;
    font-weight: 700;
  }
  .zacht {
    font-size: 24px;
    font-weight: 600;
    color: #cbd5e1;
  }
  .nee {
    font-size: 28px;
  }
</style>
