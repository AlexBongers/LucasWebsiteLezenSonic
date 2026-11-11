<script lang="ts">
  /** Sonic: Patroon-race. Kijk naar het patroon en kies wat er hierna komt (rood, blauw, rood, blauw, …?). */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { PatroonOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed } from '../audio/geluid';
  import { glitterOp } from '../ui/feest';
  import { teksten, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<PatroonOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<PatroonOpgave>(opgaven as Gepland<PatroonOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: string[] = $state([]);
  let bezig = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let vraagEl: HTMLElement | undefined = $state();
  let knopEls: HTMLElement[] = $state([]);

  let klaar = $derived(bezig || ronde.onthuld);
  let hint = $derived(ronde.pogingen > 0);
  // Op een smal scherm passen negen plaatjes: iets kleiner bij lange patronen.
  let maat = $derived(o.reeks.length > 7 ? 84 : 104);

  onMount(() => {
    void spreek(teksten.patroon.start);
  });

  async function kies(k: string, i: number) {
    if (bezig || ronde.onthuld || fout.includes(k)) return;
    if (k === o.antwoord) {
      bezig = true;
      stemming = 'juich';
      speelGoed();
      glitterOp(vraagEl ?? null);
      opRingen(ronde.goed(), knopEls[i]);
      await spreek(compliment('sonic'));
      await wacht(300);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, k];
      stemming = 'denk';
      if (ronde.fout(k) === 'onthuld') {
        await spreek(teksten.hetIs);
        await wacht(150);
      } else {
        await spreek(bijna());
        await spreek(teksten.patroon.hint);
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    bezig = false;
    stemming = 'rust';
    void spreek(teksten.patroon.vraag);
  }
</script>

<div class="spelvlak">
  <div class="heldin-plek">
    <Tekstballon kleur="#2563eb" />
    <Held wie="sonic" {stemming} hoogte={400} />
  </div>

  <div class="speelveld">
    {#key ronde.nummer}
      <div class="opdrachtkaart reeks-kaart">
        <div class="reeks" style="--m:{maat}px">
          {#each o.reeks as p, i}
            <span class="stuk" class:eerste={hint && i < o.vorm.length} style="animation-delay:{i * 0.07}s">{p}</span>
          {/each}
          <span class="stuk vraag" class:klaar bind:this={vraagEl}>{klaar ? o.antwoord : '?'}</span>
        </div>
        <div class="luid"><Luidspreker opTik={() => spreek(teksten.patroon.vraag)} /></div>
      </div>

      <div class="keuzerij">
        {#each o.keuzes as k, i (k)}
          <button
            class="keuzeknop knop"
            class:fout={fout.includes(k)}
            class:goed={ronde.onthuld && k === o.antwoord}
            style="animation-delay:{i * 0.1}s"
            bind:this={knopEls[i]}
            onclick={() => kies(k, i)}
            aria-label="Plaatje {i + 1}">{k}</button
          >
        {/each}
      </div>
    {/key}
    {#if ronde.onthuld}
      <button class="knop-goud verder-knop icoonknop" onclick={volgende} aria-label="Verder">➡️</button>
    {/if}
  </div>
</div>

<style>
  .reeks-kaart {
    padding: 22px 100px 22px 36px;
  }
  .reeks {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: nowrap;
  }
  .stuk {
    display: grid;
    place-items: center;
    width: var(--m);
    height: var(--m);
    border-radius: 22px;
    font-size: calc(var(--m) * 0.62);
    line-height: 1;
    background: rgba(255, 255, 255, 0.16);
    border: 3px solid rgba(255, 255, 255, 0.35);
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
    animation: pop-in 0.35s ease-out backwards;
  }
  .stuk.eerste {
    border-color: #fde68a;
    box-shadow: 0 0 22px rgba(253, 224, 71, 0.9);
  }
  .stuk.vraag {
    border: 4px dashed #fde68a;
    background: rgba(253, 224, 71, 0.18);
    font-family: var(--font-titel);
    font-weight: 700;
    color: #fde68a;
    animation: puls 1.1s ease-in-out infinite;
  }
  .stuk.vraag.klaar {
    animation: pop-in 0.4s ease-out;
    border-style: solid;
    color: inherit;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .luid {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
  .knop {
    width: 190px;
    min-height: 170px;
    font-size: 110px;
    line-height: 1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.07); }
  }
</style>
