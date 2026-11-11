<script lang="ts">
  /** Knuckles: Woord-bouwen. Er staat een plaatje; leg het woordje met de letterstenen in de goede volgorde. */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import type { BouwOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { teksten, rondeStart, compliment, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<BouwOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<BouwOpgave>(opgaven as Gepland<BouwOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let gebruikt: number[] = $state([]);
  let foutTegel: number | null = $state(null);
  let bezig = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let rijEl: HTMLElement | undefined = $state();

  let gevuld = $derived(gebruikt.length);
  /** Welke steen moet nu? Pas zichtbaar als hij één keer fout zat (de hint). */
  let hintTegel = $derived(
    ronde.pogingen > 0 && !ronde.onthuld ? o.tegels.findIndex((t, i) => t === o.delen[gevuld] && !gebruikt.includes(i)) : -1,
  );

  onMount(() => {
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.bouwen.start);
      await zegWoord();
    })();
  });

  async function zegWoord() {
    await spreek(teksten.bouwen.vraag);
    await spreek(o.woord, 'woord');
  }

  async function tik(i: number) {
    if (bezig || ronde.onthuld || gebruikt.includes(i)) return;
    if (o.tegels[i] === o.delen[gevuld]) {
      speelTik();
      gebruikt = [...gebruikt, i];
      if (gebruikt.length === o.delen.length) await klaar();
    } else {
      speelBijna();
      foutTegel = i;
      setTimeout(() => (foutTegel = null), 500);
      stemming = 'denk';
      if (ronde.fout(o.tegels[i]) === 'onthuld') {
        // De rest wordt voor hem gelegd.
        const nog = o.delen.slice(gevuld);
        for (const letter of nog) {
          const n = o.tegels.findIndex((t, v) => t === letter && !gebruikt.includes(v));
          if (n >= 0) gebruikt = [...gebruikt, n];
          await wacht(250);
        }
        await spreek(o.woord, 'woord');
      } else {
        await spreek(teksten.bouwen.hint);
      }
    }
  }

  async function klaar() {
    bezig = true;
    stemming = 'juich';
    speelGoed();
    boem(rijEl);
    opRingen(ronde.goed(), rijEl);
    await spreek(o.woord, 'woord');
    await spreek(compliment('knuckles'));
    await wacht(250);
    volgende();
  }

  function volgende() {
    if (!ronde.volgende()) return;
    gebruikt = [];
    bezig = false;
    stemming = 'rust';
    void zegWoord();
  }
</script>

<div class="spelvlak">
  <div class="heldin-plek">
    <Tekstballon kleur="#dc2626" />
    <Held wie="knuckles" {stemming} hoogte={400} />
  </div>

  <div class="speelveld">
    {#key ronde.nummer}
      <div class="opdrachtkaart plaat">
        <span class="emoji">{o.emoji}</span>
        <div class="luid"><Luidspreker opTik={zegWoord} /></div>
      </div>

      <div class="slots" bind:this={rijEl}>
        {#each o.delen as _, n}
          <div class="slot" class:vol={n < gevuld} class:nu={n === gevuld && !ronde.onthuld}>
            {#if n < gevuld}<span class="l">{o.tegels[gebruikt[n]]}</span>{/if}
          </div>
        {/each}
      </div>

      <div class="keuzerij tegels">
        {#each o.tegels as t, i (i)}
          <button
            class="tegel"
            class:weg={gebruikt.includes(i)}
            class:fout={foutTegel === i}
            class:hint={hintTegel === i}
            style="animation-delay:{i * 0.08}s"
            onclick={() => tik(i)}
            aria-label="Letter {t}"
          >
            {t}
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
  .plaat {
    padding: 10px 100px 10px 40px;
  }
  .emoji {
    font-size: 120px;
    line-height: 1.1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .luid {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
  .slots {
    display: flex;
    gap: 14px;
    padding: 14px 20px;
    border-radius: 24px;
    background: rgba(0, 20, 70, 0.4);
    border: 3px dashed rgba(253, 230, 138, 0.6);
  }
  .slot {
    display: grid;
    place-items: center;
    width: 130px;
    height: 140px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.12);
    border: 4px dashed rgba(255, 255, 255, 0.45);
  }
  .slot.nu {
    border-color: #fde68a;
    animation: puls 1s ease-in-out infinite;
  }
  .slot.vol {
    background: linear-gradient(180deg, #fde68a, #f59e0b);
    border: 4px solid #7c2d12;
    box-shadow: 0 6px 0 #7c2d12;
    animation: pop-in 0.3s ease-out;
  }
  .l {
    font-family: var(--font-lees);
    font-size: 96px;
    font-weight: 700;
    color: #3b1d00;
    line-height: 1;
  }
  .tegels {
    gap: 18px;
    flex-wrap: wrap;
  }
  .tegel {
    width: 130px;
    height: 140px;
    border-radius: 18px;
    font-family: var(--font-lees);
    font-size: 96px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
    background: linear-gradient(180deg, #c47a3a, #8a4f14);
    border: 4px solid #4a2606;
    box-shadow: 0 8px 0 #4a2606, 0 14px 22px rgba(0, 0, 0, 0.35);
    animation: pop-in 0.4s ease-out backwards;
    transition: transform 0.1s;
  }
  .tegel:active {
    transform: translateY(6px);
  }
  .tegel.weg {
    visibility: hidden;
  }
  .tegel.fout {
    animation: schud 0.5s ease-in-out;
    filter: brightness(0.7);
  }
  .tegel.hint {
    background: linear-gradient(180deg, #fde68a, #f59e0b);
    color: #3b1d00;
    text-shadow: none;
    box-shadow: 0 8px 0 #7c2d12, 0 0 34px rgba(253, 224, 71, 0.95);
    animation: spring 0.7s ease-in-out infinite;
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }
  @keyframes spring {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-14px); }
  }
</style>
