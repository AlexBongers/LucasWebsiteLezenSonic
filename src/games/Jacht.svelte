<script lang="ts">
  /**
   * Knuckles: Letter-jacht. Een rooster van stenen met letters. Sla ALLE stenen met de gezochte letter kapot.
   * Zoeken tussen letters is een belangrijke leesvaardigheid (visuele discriminatie).
   */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import type { JachtOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<JachtOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<JachtOpgave>(opgaven as Gepland<JachtOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let kapot: number[] = $state([]);
  let foutIdx: number | null = $state(null);
  let bezig = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let steenEls: HTMLElement[] = $state([]);
  let veldEl: HTMLElement | undefined = $state();

  let over = $derived(o.doelen.filter((i) => !kapot.includes(i)).length);
  let hint = $derived(ronde.pogingen > 0 && !bezig);

  onMount(() => {
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.jacht.start);
      await vraag();
    })();
  });

  async function vraag() {
    await spreek(teksten.jacht.vraag);
    await spreek(o.woord, 'woord');
  }

  async function sla(i: number) {
    if (bezig || kapot.includes(i)) return;
    if (o.doelen.includes(i)) {
      kapot = [...kapot, i];
      stemming = 'dans';
      boem(steenEls[i], 150);
      if (o.doelen.every((d) => kapot.includes(d))) await klaar();
    } else {
      speelBijna();
      foutIdx = i;
      setTimeout(() => (foutIdx = null), 500);
      stemming = 'denk';
      if (ronde.fout(o.tegels[i]) === 'onthuld') {
        bezig = true;
        for (const d of o.doelen.filter((x) => !kapot.includes(x))) {
          kapot = [...kapot, d];
          boem(steenEls[d], 150);
          await wacht(350);
        }
        await spreek(teksten.hetIs);
        await spreek(o.woord, 'woord');
      } else {
        await spreek(bijna());
        await spreek(teksten.jacht.hint);
      }
    }
  }

  async function klaar() {
    bezig = true;
    stemming = 'juich';
    speelGoed();
    opRingen(ronde.goed(), veldEl);
    await spreek(teksten.jacht.klaar);
    await spreek(compliment('knuckles'));
    await wacht(250);
    volgende();
  }

  function volgende() {
    if (!ronde.volgende()) return;
    kapot = [];
    bezig = false;
    stemming = 'rust';
    void vraag();
  }
</script>

<div class="spelvlak">
  <div class="heldin-plek">
    <Tekstballon kleur="#dc2626" />
    <Held wie="knuckles" {stemming} hoogte={400} />
  </div>

  <div class="speelveld">
    {#key ronde.nummer}
      <div class="opdrachtkaart doelkaart">
        <span class="zoek">Zoek</span>
        <span class="doelletter">{o.letter}</span>
        <span class="emoji">{o.emoji}</span>
        <span class="over">nog {over}</span>
        <div class="luid"><Luidspreker opTik={vraag} /></div>
      </div>

      <div class="rooster" class:zes={o.tegels.length === 6} bind:this={veldEl}>
        {#each o.tegels as t, i (i)}
          <button
            class="steen"
            class:weg={kapot.includes(i)}
            class:fout={foutIdx === i}
            class:hint={hint && o.doelen.includes(i)}
            style="animation-delay:{i * 0.05}s"
            bind:this={steenEls[i]}
            onclick={() => sla(i)}
            aria-label="Letter {t}"
          >
            <span class="letter">{t}</span>
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
  .doelkaart {
    flex-direction: row;
    align-items: center;
    gap: 22px;
    padding: 10px 100px 10px 34px;
  }
  .zoek {
    font-size: 36px;
    font-weight: 700;
  }
  .doelletter {
    display: grid;
    place-items: center;
    width: 96px;
    height: 96px;
    border-radius: 20px;
    font-family: var(--font-lees);
    font-size: 84px;
    font-weight: 700;
    line-height: 1;
    color: #3b1d00;
    background: linear-gradient(180deg, #fde68a, #f59e0b);
    border: 4px solid #7c2d12;
    box-shadow: 0 5px 0 #7c2d12;
  }
  .emoji {
    font-size: 70px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .over {
    min-width: 110px;
    font-size: 34px;
    font-weight: 700;
    color: #fde68a;
  }
  .luid {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
  .rooster {
    display: grid;
    grid-template-columns: repeat(3, 150px);
    gap: 16px;
  }
  .rooster.zes {
    grid-template-columns: repeat(3, 170px);
  }
  .steen {
    height: 128px;
    display: grid;
    place-items: center;
    border-radius: 44% 56% 46% 54% / 52% 46% 54% 48%;
    background: radial-gradient(circle at 32% 28%, #e2e8f0, #94a3b8 48%, #475569);
    border: 5px solid #1e293b;
    box-shadow: 0 8px 0 #1e293b, 0 14px 22px rgba(0, 0, 0, 0.4);
    animation: pop-in 0.4s ease-out backwards;
    transition: transform 0.1s;
  }
  .rooster.zes .steen {
    height: 150px;
  }
  .steen:active {
    transform: translateY(5px) scale(0.97);
  }
  .letter {
    font-family: var(--font-lees);
    font-size: 88px;
    font-weight: 700;
    line-height: 1;
    color: #0f172a;
    text-shadow: 0 3px 0 rgba(255, 255, 255, 0.5);
  }
  .steen.weg {
    visibility: hidden;
  }
  .steen.fout {
    animation: schud 0.5s ease-in-out;
    filter: brightness(0.6);
  }
  .steen.hint {
    background: radial-gradient(circle at 32% 28%, #fef9c3, #fbbf24 55%, #b45309);
    box-shadow: 0 8px 0 #7c2d12, 0 0 36px rgba(253, 224, 71, 0.95);
    animation: sprong 0.7s ease-in-out infinite;
  }
  @keyframes sprong {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
</style>
