<script lang="ts">
  /**
   * Tails: Tel & Bouw. Bouw een toren van n stenen en laat hem ontploffen met de bom,
   * of tel hoeveel stenen er staan. Elke steen wordt hardop geteld.
   */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import type { TelOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { teksten, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<TelOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<TelOpgave>(opgaven as Gepland<TelOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let aantal = $state(0);
  let fout: number[] = $state([]);
  let bezig = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let torenEl: HTMLElement | undefined = $state();
  let knopEls: HTMLElement[] = $state([]);

  const MAX = 20;
  // Bij tellen staat de toren er al; bij bouwen groeit hij met elke tik.
  let stenen = $derived(o.soort === 'tel' || ronde.onthuld ? o.n : aantal);
  let toonGetallen = $derived(ronde.pogingen > 0);

  onMount(() => {
    void zegOpdracht();
  });

  async function zegOpdracht() {
    if (o.soort === 'tel') return spreek(teksten.telbouw.tel);
    await spreek(teksten.telbouw.bouw);
    await spreek(String(o.n), 'getal');
    await spreek(teksten.telbouw.stenen);
  }

  function pas(d: number) {
    if (bezig || ronde.onthuld) return;
    const nieuw = Math.max(0, Math.min(MAX, aantal + d));
    if (nieuw === aantal) return;
    aantal = nieuw;
    speelTik();
    // Elke steen wordt hardop geteld.
    if (d > 0) void spreek(String(aantal), 'getal');
  }

  async function goed(bron: Element | null | undefined) {
    bezig = true;
    stemming = 'juich';
    speelGoed();
    boem(bron, 300);
    opRingen(ronde.goed(), bron);
    await spreek(String(o.n), 'getal');
    await spreek(compliment('tails'));
    await wacht(250);
    volgende();
  }

  async function nietGoed(gekozen: number) {
    speelBijna();
    stemming = 'denk';
    if (ronde.fout(String(gekozen)) === 'onthuld') {
      await spreek(teksten.hetIs);
      await spreek(String(o.n), 'getal');
    } else if (o.soort === 'bouw') {
      await spreek(gekozen > o.n ? teksten.telbouw.teVeel : teksten.telbouw.teWeinig);
    } else {
      await spreek(bijna());
    }
  }

  async function bom() {
    if (bezig || ronde.onthuld) return;
    if (aantal === o.n) await goed(torenEl);
    else await nietGoed(aantal);
  }

  async function kies(n: number, i: number) {
    if (bezig || ronde.onthuld || fout.includes(n)) return;
    if (n === o.n) await goed(torenEl);
    else {
      fout = [...fout, n];
      await nietGoed(n);
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    aantal = 0;
    fout = [];
    bezig = false;
    stemming = 'rust';
    void zegOpdracht();
  }
</script>

<div class="spelvlak">
  <div class="heldin-plek">
    <Tekstballon kleur="#f59e0b" />
    <Held wie="tails" {stemming} hoogte={400} />
  </div>

  <div class="speelveld">
    {#key ronde.nummer}
      {#if o.soort === 'bouw'}
        <div class="opdrachtkaart opdracht">
          <div class="doel">Bouw een toren van <span class="hint-goud">{o.n}</span></div>
          <div class="luid"><Luidspreker opTik={zegOpdracht} /></div>
        </div>
      {:else}
        <div class="opdrachtkaart opdracht">
          <div class="doel">Hoeveel stenen?</div>
          <div class="luid"><Luidspreker opTik={zegOpdracht} /></div>
        </div>
      {/if}

      <div class="werkplaats">
        <div class="toren" bind:this={torenEl}>
          {#each Array.from({ length: stenen }) as _, i (i)}
            <div class="steen" class:rij2={Math.floor(i / 5) % 2 === 1} class:vijf={i % 5 === 4}>
              {#if toonGetallen || ronde.onthuld}{i + 1}{/if}
            </div>
          {/each}
          {#if stenen === 0}<span class="leeg">nog geen stenen</span>{/if}
        </div>

        {#if o.soort === 'bouw'}
          <div class="bediening">
            <button class="rond min" onclick={() => pas(-1)} aria-label="Steen eraf">−</button>
            <button class="rond plus" onclick={() => pas(1)} aria-label="Steen erbij">+</button>
            <button class="bom" onclick={bom} aria-label="Ontplof de toren" disabled={ronde.onthuld}>
              <span class="b-icoon">💣</span>
              <span>💥</span>
            </button>
          </div>
        {/if}
      </div>

      {#if o.soort === 'tel'}
        <div class="keuzerij">
          {#each o.keuzes ?? [] as k, i (k)}
            <button
              class="keuzeknop getal"
              class:fout={fout.includes(k)}
              class:goed={ronde.onthuld && k === o.n}
              style="animation-delay:{i * 0.1}s"
              bind:this={knopEls[i]}
              onclick={() => kies(k, i)}>{k}</button
            >
          {/each}
        </div>
      {/if}
    {/key}
    {#if ronde.onthuld}
      <button class="knop-goud verder-knop icoonknop" onclick={volgende} aria-label="Verder">➡️</button>
    {/if}
  </div>
</div>

<style>
  .opdracht {
    padding: 12px 100px 12px 44px;
  }
  .doel {
    font-size: 54px;
    font-weight: 700;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
  }
  .luid {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
  .werkplaats {
    display: flex;
    align-items: flex-end;
    gap: 40px;
  }
  .toren {
    display: flex;
    flex-wrap: wrap-reverse;
    align-content: flex-start;
    width: 340px;
    min-height: 240px;
    gap: 4px;
    padding: 10px;
    border-bottom: 8px solid #3b2410;
    background: rgba(0, 20, 70, 0.25);
    border-radius: 16px 16px 0 0;
  }
  .steen {
    display: grid;
    place-items: center;
    width: 58px;
    height: 50px;
    border-radius: 8px;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
    background: linear-gradient(180deg, #e0883f, #b45309);
    border: 3px solid #4a2606;
    box-shadow: inset 0 3px 0 rgba(255, 255, 255, 0.3);
    animation: pop-in 0.25s ease-out;
  }
  .steen.rij2 {
    background: linear-gradient(180deg, #5aa0f0, #1d4ed8);
  }
  .steen.vijf {
    margin-right: 0;
  }
  .leeg {
    align-self: center;
    margin: auto;
    font-size: 24px;
    color: #bfdbfe;
  }
  .bediening {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .rond {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    font-size: 70px;
    font-weight: 700;
    line-height: 1;
    border: 4px solid #fff;
    box-shadow: 0 7px 0 rgba(0, 0, 0, 0.35);
  }
  .rond.min {
    background: #ef4444;
  }
  .rond.plus {
    background: #22c55e;
  }
  .rond:active {
    transform: translateY(5px);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
  }
  .bom {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 150px;
    padding: 8px 20px;
    border-radius: 28px;
    font-size: 34px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(180deg, #f87171, #b91c1c);
    border: 4px solid #fff;
    box-shadow: 0 8px 0 #7f1d1d, 0 0 26px rgba(248, 113, 113, 0.6);
  }
  .bom:active {
    transform: translateY(6px);
  }
  .bom:disabled {
    opacity: 0.5;
  }
  .b-icoon {
    font-size: 58px;
    line-height: 1.1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .getal {
    min-width: 170px;
    min-height: 130px;
    font-size: 80px;
    font-family: var(--font-titel);
  }
</style>
