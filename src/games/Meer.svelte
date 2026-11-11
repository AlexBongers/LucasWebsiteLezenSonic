<script lang="ts">
  /**
   * Sonic: Meer-race. Twee eilanden met ringen (of getallen). Tik de kant die meer (of minder) heeft.
   * Vergelijken is de basis van getalbegrip: groter, kleiner, meer, minder.
   */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import { meerAntwoord, type MeerOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed } from '../audio/geluid';
  import { glitterOp } from '../ui/feest';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<MeerOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<MeerOpgave>(opgaven as Gepland<MeerOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let goedeKant = $derived(meerAntwoord(o));
  let fout: ('links' | 'rechts')[] = $state([]);
  let gekozen: 'links' | 'rechts' | null = $state(null);
  let bezig = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let eilandEls: Record<string, HTMLElement | undefined> = $state({});

  let vraagTekst = $derived(
    o.vorm === 'ringen' ? (o.vraag === 'meer' ? teksten.meer.meerRingen : teksten.meer.minderRingen) : o.vraag === 'meer' ? teksten.meer.groter : teksten.meer.kleiner,
  );
  let toonGetal = $derived(ronde.pogingen > 0 || ronde.onthuld);

  onMount(() => {
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.meer.start);
      await spreek(vraagTekst);
    })();
  });

  async function kies(kant: 'links' | 'rechts') {
    if (bezig || ronde.onthuld || fout.includes(kant)) return;
    if (kant === goedeKant) {
      bezig = true;
      gekozen = kant;
      stemming = 'juich';
      speelGoed();
      glitterOp(eilandEls[kant] ?? null);
      opRingen(ronde.goed(), eilandEls[kant]);
      await spreek(compliment('sonic'));
      await wacht(300);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, kant];
      stemming = 'denk';
      if (ronde.fout(kant) === 'onthuld') {
        gekozen = goedeKant;
        await spreek(teksten.hetIs);
        await spreek(String(goedeKant === 'links' ? o.a : o.b), 'getal');
      } else {
        await spreek(bijna());
        await spreek(teksten.meer.hint);
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    gekozen = null;
    bezig = false;
    stemming = 'rust';
    void spreek(vraagTekst);
  }

  const kanten = $derived([
    { kant: 'links' as const, n: o.a },
    { kant: 'rechts' as const, n: o.b },
  ]);
</script>

<div class="spelvlak">
  <div class="heldin-plek">
    <Tekstballon kleur="#2563eb" />
    <Held wie="sonic" {stemming} hoogte={400} />
  </div>

  <div class="speelveld">
    {#key ronde.nummer}
      <div class="opdrachtkaart vraagkaart">
        <div class="vraag">{vraagTekst}</div>
        <div class="luid"><Luidspreker opTik={() => spreek(vraagTekst)} /></div>
      </div>

      <div class="eilanden">
        {#each kanten as k, i (k.kant)}
          <button
            class="eiland"
            class:fout={fout.includes(k.kant)}
            class:goed={gekozen === k.kant}
            style="animation-delay:{i * 0.12}s"
            bind:this={eilandEls[k.kant]}
            onclick={() => kies(k.kant)}
            aria-label={k.kant}
          >
            {#if toonGetal || o.vorm === 'cijfers'}
              <span class="getal" class:groot={o.vorm === 'cijfers'}>{k.n}</span>
            {/if}
            {#if o.vorm === 'ringen' || toonGetal}
              <span class="hoop" class:klein={o.vorm === 'cijfers'}>
                {#each Array.from({ length: k.n }) as _, r}
                  <svg class="r" viewBox="0 0 40 40" style="animation-delay:{r * 0.04}s" aria-hidden="true">
                    <circle cx="20" cy="20" r="14" fill="none" stroke="#fbbf24" stroke-width="8" />
                    <circle cx="20" cy="20" r="14" fill="none" stroke="#fff7c2" stroke-width="1.5" />
                  </svg>
                {/each}
              </span>
            {/if}
            <span class="grond"></span>
          </button>
        {/each}
      </div>
    {/key}
    {#if ronde.onthuld}
      <button class="knop-goud verder-knop icoonknop" onclick={volgende} aria-label="Verder">➡️</button>
    {/if}
  </div>
</div>

<style>
  .vraagkaart {
    padding: 14px 100px 14px 44px;
  }
  .vraag {
    font-size: 46px;
    font-weight: 700;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
  }
  .luid {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
  .eilanden {
    display: flex;
    gap: 50px;
    align-items: flex-end;
  }
  .eiland {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    width: 390px;
    height: 280px;
    padding: 14px 16px 0;
    animation: pop-in 0.45s ease-out backwards;
    transition: transform 0.15s, filter 0.3s, opacity 0.3s;
  }
  .eiland:active {
    transform: scale(0.97);
  }
  .hoop {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-end;
    gap: 2px;
    max-width: 330px;
    min-height: 90px;
  }
  .r {
    width: 52px;
    height: 52px;
    filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.9));
    animation: pop-in 0.35s ease-out backwards;
  }
  .hoop.klein .r {
    width: 32px;
    height: 32px;
  }
  .getal {
    font-size: 64px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.4);
  }
  .getal.groot {
    font-size: 150px;
  }
  /* De grond waarop de ringen liggen: een stukje heuvel met schaakbord */
  .grond {
    width: 100%;
    height: 46px;
    margin-top: 4px;
    border-radius: 24px 24px 8px 8px;
    background:
      linear-gradient(180deg, #5ccf6a 0 14px, transparent 14px),
      repeating-conic-gradient(#8a4f14 0 25%, #a8641f 0 50%) 0 0 / 40px 40px;
    border: 4px solid #1f5a29;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
  }
  .eiland.goed .grond {
    box-shadow: 0 0 40px rgba(134, 239, 172, 0.95);
    border-color: #86efac;
  }
  .eiland.goed {
    animation: pop-in 0.5s ease-out;
  }
  .eiland.fout {
    animation: schud 0.5s ease-in-out;
    filter: grayscale(0.85) brightness(0.7);
    opacity: 0.6;
  }
</style>
