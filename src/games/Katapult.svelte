<script lang="ts">
  /**
   * Tails: Katapult-sommen. Een som met ringen erbij; robots dragen de antwoorden.
   * Tik op de robot met het goede antwoord: de katapult schiet hem weg.
   */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Robot from '../art/Robot.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import type { Som } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { somDelen, spreek } from '../audio/stem';
  import { speelBijna, speelGoed } from '../audio/geluid';
  import { boem, werp } from '../ui/boem';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [], niveau = 0 }: SpelProps<Som> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<Som>(opgaven as Gepland<Som>[], { opKlaar, opVoortgang });
  let som = $derived(ronde.huidig);
  let kapot: number | null = $state(null);
  let lacht: number | null = $state(null);
  let fout: number[] = $state([]);
  let bezig = $state(false);
  let afgevuurd = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let robotEls: HTMLElement[] = $state([]);
  let kopEl: HTMLElement | undefined = $state();

  // De ringen staan in beeld op de lage niveaus; daarna alleen als hint.
  let toonRingen = $derived(niveau <= 1 || ronde.pogingen > 0 || ronde.onthuld);

  onMount(() => {
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.katapult.start);
      await zegSom();
    })();
  });

  function zegSom() {
    return spreek(somDelen(som.a, som.op, som.b), 'getal');
  }

  async function schiet(keuze: number, i: number) {
    if (bezig || ronde.onthuld || fout.includes(keuze)) return;
    bezig = true;
    afgevuurd = true;
    setTimeout(() => (afgevuurd = false), 450);
    await werp(kopEl, robotEls[i]);
    if (keuze === som.antwoord) {
      kapot = i;
      stemming = 'juich';
      speelGoed();
      boem(robotEls[i]);
      opRingen(ronde.goed(), robotEls[i]);
      await spreek(somDelen(som.a, som.op, som.b, som.antwoord), 'getal');
      await spreek(compliment('tails'));
      await wacht(250);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, keuze];
      lacht = i;
      setTimeout(() => (lacht = lacht === i ? null : lacht), 1300);
      stemming = 'denk';
      if (ronde.fout(String(keuze)) === 'onthuld') {
        await spreek(teksten.hetIs);
        await spreek(String(som.antwoord), 'getal');
        await spreek(teksten.verder);
      } else {
        await spreek(bijna());
        await spreek(teksten.katapult.hint);
        bezig = false;
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    kapot = null;
    lacht = null;
    fout = [];
    bezig = false;
    stemming = 'rust';
    void zegSom();
  }
</script>

<div class="spelvlak">
  <div class="heldin-plek">
    <Tekstballon kleur="#f59e0b" />
    <Held wie="tails" {stemming} hoogte={380} />
    <!-- de katapult -->
    <svg class="katapult" viewBox="0 0 170 140" aria-hidden="true">
      <path d="M20 128 L56 60 L92 128 Z" fill="#a8641f" stroke="#4a2606" stroke-width="5" stroke-linejoin="round" />
      <rect x="10" y="122" width="100" height="14" rx="5" fill="#8a4f14" stroke="#4a2606" stroke-width="4" />
      <circle cx="26" cy="138" r="11" fill="#475569" stroke="#0a1540" stroke-width="4" />
      <circle cx="96" cy="138" r="11" fill="#475569" stroke="#0a1540" stroke-width="4" />
      <g class="arm" class:afgevuurd>
        <path d="M56 66 L128 24" stroke="#c47a3a" stroke-width="11" stroke-linecap="round" />
        <path d="M56 66 L128 24" stroke="#4a2606" stroke-width="3" stroke-linecap="round" opacity="0.5" />
        <path d="M112 30 q14 -4 28 -8 l4 12 q-14 12 -32 6 z" fill="#8a4f14" stroke="#4a2606" stroke-width="4" stroke-linejoin="round" />
        <circle cx="56" cy="66" r="7" fill="#fbbf24" stroke="#4a2606" stroke-width="3" />
      </g>
    </svg>
    <span class="kop" bind:this={kopEl}></span>
  </div>

  <div class="speelveld">
    {#key ronde.nummer}
      <div class="opdrachtkaart som-kaart">
        <div class="som">
          <span>{som.a}</span>
          <span class="op">{som.op === '+' ? '+' : '−'}</span>
          <span>{som.b}</span>
          <span class="op">=</span>
          <span class="antw" class:onthuld={ronde.onthuld}>{ronde.onthuld ? som.antwoord : '?'}</span>
        </div>
        {#if toonRingen}
          <div class="ringrij">
            {#each Array.from({ length: som.a }) as _, i}
              <svg class="r" class:weg={som.op === '-' && i >= som.a - som.b} viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="14" fill="none" stroke="#fbbf24" stroke-width="8" />
                <circle cx="20" cy="20" r="14" fill="none" stroke="#fff7c2" stroke-width="1.5" />
              </svg>
              {#if i === 9 && som.a > 10}<span class="tiental"></span>{/if}
            {/each}
            {#if som.op === '+'}
              <span class="plus">+</span>
              {#each Array.from({ length: som.b }) as _, i}
                <svg class="r nieuw" viewBox="0 0 40 40" aria-hidden="true">
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#f97316" stroke-width="8" />
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#fed7aa" stroke-width="1.5" />
                </svg>
              {/each}
            {/if}
          </div>
        {/if}
        <div class="luid"><Luidspreker opTik={zegSom} /></div>
      </div>

      <div class="robots">
        {#each som.keuzes as k, i (k)}
          <button
            class="robotknop"
            class:fout={fout.includes(k)}
            class:goed={ronde.onthuld && k === som.antwoord}
            style="animation-delay:{i * 0.12}s"
            onclick={() => schiet(k, i)}
            aria-label="Antwoord {k}"
          >
            {#if lacht === i}<span class="haha">hihi!</span>{/if}
            <span class="bord">{k}</span>
            <span class="r-plek" bind:this={robotEls[i]}><Robot soort={i + ronde.nummer} grootte={160} kapot={kapot === i} /></span>
          </button>
        {/each}
      </div>
    {/key}
    {#if ronde.onthuld}
      <button class="knop-goud verder-knop" onclick={volgende}>Verder ➜</button>
    {/if}
  </div>
</div>

<style>
  .katapult {
    position: absolute;
    right: -128px;
    bottom: 18px;
    width: 190px;
    height: 156px;
    overflow: visible;
    filter: drop-shadow(0 6px 8px rgba(0, 0, 40, 0.4));
  }
  .arm {
    transform-origin: 56px 66px;
    transform-box: view-box;
  }
  .arm.afgevuurd {
    animation: klap 0.45s ease-out;
  }
  @keyframes klap {
    0% { transform: rotate(-55deg); }
    35% { transform: rotate(30deg); }
    100% { transform: rotate(0); }
  }
  .kop {
    position: absolute;
    right: -100px;
    bottom: 118px;
    width: 40px;
    height: 40px;
  }
  .som-kaart {
    padding: 12px 100px 14px 48px;
    min-width: 560px;
  }
  .som {
    display: flex;
    gap: 22px;
    align-items: center;
    font-size: 84px;
    font-weight: 700;
    line-height: 1.1;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
  }
  .op {
    color: var(--goud);
  }
  .antw {
    min-width: 1.3em;
    text-align: center;
    color: #fca5a5;
  }
  .antw.onthuld {
    color: #86efac;
    animation: pop-in 0.5s ease-out;
  }
  .luid {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
  .ringrij {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    max-width: 640px;
  }
  .r {
    width: 40px;
    height: 40px;
    filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.8));
    animation: pop-in 0.3s ease-out backwards;
  }
  .r.weg {
    opacity: 0.25;
    filter: grayscale(1);
  }
  .r.nieuw {
    filter: drop-shadow(0 0 5px rgba(249, 115, 22, 0.8));
  }
  .plus {
    margin: 0 8px;
    font-size: 34px;
    font-weight: 700;
    color: #fde68a;
  }
  .tiental {
    flex-basis: 100%;
    height: 0;
  }
  .robots {
    display: flex;
    gap: 40px;
    justify-content: center;
    align-items: end;
    margin-top: 14px;
  }
  .robotknop {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
    animation: robot-in 0.5s ease-out backwards;
  }
  .bord {
    min-width: 118px;
    padding: 6px 16px;
    margin-bottom: -10px;
    border-radius: 20px;
    font-size: 58px;
    font-weight: 700;
    line-height: 1.1;
    color: var(--inkt);
    background: linear-gradient(180deg, #fffaf0, #fde68a);
    border: 4px solid #fff;
    box-shadow: 0 6px 0 #b45309, 0 10px 20px rgba(0, 0, 0, 0.35);
    position: relative;
    z-index: 1;
  }
  .robotknop:active .bord {
    transform: translateY(4px);
    box-shadow: 0 2px 0 #b45309;
  }
  .robotknop.fout {
    animation: schud 0.5s ease-in-out;
    filter: grayscale(0.7) brightness(0.7);
    opacity: 0.6;
  }
  .robotknop.goed .bord {
    background: linear-gradient(180deg, #dcfce7, #86efac);
    box-shadow: 0 6px 0 #15803d, 0 0 30px rgba(134, 239, 172, 0.9);
  }
  .haha {
    position: absolute;
    right: -26px;
    top: -34px;
    z-index: 2;
    padding: 4px 12px;
    border-radius: 14px;
    background: #fff;
    color: #1d4ed8;
    font-size: 22px;
    font-weight: 700;
    transform: rotate(10deg);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    animation: pop-in 0.3s ease-out;
  }
  @keyframes robot-in {
    from { transform: translateY(120px) scale(0.6); opacity: 0; }
  }
</style>
