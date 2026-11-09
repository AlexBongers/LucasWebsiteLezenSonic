<script lang="ts">
  /**
   * Tails: Splits-bom. De bom heeft n ringen nodig, er zijn er al a. Hoeveel moeten er nog bij?
   * Splitsen (7 = 4 + 3) is een hoofdonderdeel van het rekenen in groep 3.
   */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { SplitsOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik } from '../audio/geluid';
  import { glitterOp } from '../ui/feest';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<SplitsOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<SplitsOpgave>(opgaven as Gepland<SplitsOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: number[] = $state([]);
  let gevuld = $state(0);
  let veilig = $state(false);
  let bezig = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let bomEl: HTMLElement | undefined = $state();
  let knopEls: HTMLElement[] = $state([]);

  let toonGetallen = $derived(ronde.pogingen > 0);

  onMount(() => {
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.splits.start);
      await vraag();
    })();
  });

  async function vraag() {
    await spreek(teksten.splits.vraag1);
    await spreek(String(o.totaal), 'getal');
    await spreek(teksten.splits.vraag2);
    await spreek(String(o.a), 'getal');
    await spreek(teksten.splits.vraag3);
  }

  /** De lege plekjes vullen een voor een: zo zie je splitsen gebeuren. */
  async function vul(naar: number) {
    for (let n = gevuld; n < naar; n++) {
      gevuld = n + 1;
      speelTik();
      await wacht(160);
    }
  }

  async function kies(b: number, i: number) {
    if (bezig || ronde.onthuld || fout.includes(b)) return;
    if (b === o.b) {
      bezig = true;
      await vul(o.totaal);
      veilig = true;
      stemming = 'juich';
      speelGoed();
      glitterOp(bomEl ?? null);
      opRingen(ronde.goed(), bomEl);
      await spreek(teksten.splits.klaar);
      await spreek(compliment('tails'));
      await wacht(200);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, b];
      stemming = 'denk';
      if (ronde.fout(String(b)) === 'onthuld') {
        await vul(o.totaal);
        veilig = true;
        await spreek(teksten.hetIs);
        await spreek(String(o.b), 'getal');
      } else {
        await spreek(bijna());
        await spreek(teksten.splits.hint);
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    gevuld = 0;
    veilig = false;
    bezig = false;
    stemming = 'rust';
    void vraag();
  }

  // Er zijn al `a` ringen; die staan er meteen. De rest is leeg.
  let aanwezig = $derived(o.a);
</script>

<div class="spelvlak">
  <div class="heldin-plek">
    <Tekstballon kleur="#f59e0b" />
    <Held wie="tails" {stemming} hoogte={400} />
  </div>

  <div class="speelveld">
    {#key ronde.nummer}
      <div class="bom-rij">
        <div class="bom" class:veilig bind:this={bomEl}>
          <svg viewBox="0 0 160 170" aria-hidden="true">
            <defs>
              <radialGradient id="bomkleur" cx="0.35" cy="0.3" r="0.9">
                <stop offset="0" stop-color="#64748b" />
                <stop offset="0.6" stop-color="#1e293b" />
                <stop offset="1" stop-color="#0f172a" />
              </radialGradient>
            </defs>
            <path d="M104 26 C116 6 140 12 144 -2" fill="none" stroke="#a8641f" stroke-width="6" stroke-linecap="round" />
            {#if !veilig}
              <g class="vonk">
                <circle cx="144" cy="-2" r="8" fill="#fde047" />
                <path d="M144 -16 v8 M144 12 v8 M130 -2 h8 M150 -2 h8 M134 -12 l6 6 M154 8 l-6 -6" stroke="#f97316" stroke-width="3" stroke-linecap="round" />
              </g>
            {/if}
            <rect x="88" y="24" width="32" height="20" rx="5" fill="#475569" stroke="#0a1540" stroke-width="4" />
            <circle cx="78" cy="102" r="62" fill="url(#bomkleur)" stroke="#0a1540" stroke-width="5" />
            <ellipse cx="54" cy="70" rx="16" ry="9" fill="#fff" opacity="0.35" transform="rotate(-35 54 70)" />
          </svg>
          <span class="bomgetal">{o.totaal}</span>
        </div>
        <div class="uitleg">
          <div class="regel">
            <strong>{o.totaal}</strong> ringen nodig
          </div>
          <div class="regel klein">{o.a} er al · nog <span class="vraag">?</span></div>
        </div>
        <div class="luid"><Luidspreker opTik={vraag} /></div>
      </div>

      <div class="plekken" class:smal={o.totaal > 10}>
        {#each Array.from({ length: o.totaal }) as _, i}
          <div class="plek" class:vol={i < aanwezig || i < gevuld} class:nieuw={i >= aanwezig && i < gevuld}>
            {#if i < aanwezig || i < gevuld}
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="14" fill="none" stroke={i < aanwezig ? '#fbbf24' : '#f97316'} stroke-width="8" />
                <circle cx="20" cy="20" r="14" fill="none" stroke="#fff7c2" stroke-width="1.5" />
              </svg>
            {:else if toonGetallen}
              <span class="n">{i - aanwezig + 1}</span>
            {/if}
          </div>
        {/each}
      </div>

      <div class="keuzerij">
        {#each o.keuzes as k, i (k)}
          <button
            class="keuzeknop getal"
            class:fout={fout.includes(k)}
            class:goed={ronde.onthuld && k === o.b}
            style="animation-delay:{i * 0.1}s"
            bind:this={knopEls[i]}
            onclick={() => kies(k, i)}>{k}</button
          >
        {/each}
      </div>
    {/key}
    {#if ronde.onthuld}
      <button class="knop-goud verder-knop" onclick={volgende}>Verder ➜</button>
    {/if}
  </div>
</div>

<style>
  .bom-rij {
    position: relative;
    display: flex;
    align-items: center;
    gap: 26px;
    padding: 6px 100px 6px 30px;
    border-radius: 30px;
    background: linear-gradient(160deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05));
    border: 3px solid rgba(253, 230, 138, 0.55);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
    animation: pop-in 0.45s ease-out;
  }
  .bom {
    position: relative;
    width: 130px;
    height: 150px;
    animation: wiebel 1.6s ease-in-out infinite;
  }
  .bom.veilig {
    animation: pop-in 0.5s ease-out;
    filter: drop-shadow(0 0 24px #86efac);
  }
  .bom svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .vonk {
    animation: vonk 0.3s steps(2) infinite;
    transform-origin: 144px -2px;
    transform-box: view-box;
  }
  .bomgetal {
    position: absolute;
    left: 0;
    right: 12px;
    top: 52px;
    text-align: center;
    font-size: 64px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.6);
  }
  .uitleg .regel {
    font-size: 38px;
    font-weight: 700;
  }
  .uitleg .klein {
    font-size: 30px;
    color: #fde68a;
  }
  .vraag {
    color: #fca5a5;
  }
  .luid {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
  .plekken {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    max-width: 760px;
    padding: 12px 16px;
    border-radius: 24px;
    background: rgba(0, 20, 70, 0.4);
    border: 3px dashed rgba(253, 230, 138, 0.5);
  }
  .plek {
    display: grid;
    place-items: center;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 3px dashed rgba(255, 255, 255, 0.4);
    color: #fde68a;
    font-size: 30px;
    font-weight: 700;
  }
  .plekken.smal .plek {
    width: 56px;
    height: 56px;
  }
  .plek.vol {
    border: none;
    background: none;
    filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.9));
  }
  .plek.nieuw svg {
    animation: pop-in 0.3s ease-out;
  }
  .plek svg {
    width: 100%;
    height: 100%;
  }
  .getal {
    min-width: 170px;
    min-height: 120px;
    font-size: 80px;
    font-family: var(--font-titel);
  }
  @keyframes wiebel {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
  }
  @keyframes vonk {
    50% { transform: scale(1.3) rotate(20deg); }
  }
</style>
