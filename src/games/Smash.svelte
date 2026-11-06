<script lang="ts">
  /** Knuckles: Letter-smash. De stem zegt een woord; sla de steen met de eerste letter kapot. */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import type { SmashOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { teksten, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<SmashOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<SmashOpgave>(opgaven as Gepland<SmashOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: string[] = $state([]);
  let kapot: string | null = $state(null);
  let bezig = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let steenEls: HTMLElement[] = $state([]);

  onMount(() => {
    (async () => {
      await spreek(teksten.smash.start);
      await vraag();
    })();
  });

  async function vraag() {
    await spreek(teksten.smash.vraag);
    await spreek(o.woord, 'woord');
  }

  async function sla(letter: string, i: number) {
    if (bezig || ronde.onthuld || fout.includes(letter)) return;
    if (letter === o.letter) {
      bezig = true;
      stemming = 'juich';
      kapot = letter;
      speelGoed();
      boem(steenEls[i]);
      opRingen(ronde.goed(), steenEls[i]);
      await spreek(o.woord, 'woord');
      await spreek(compliment());
      await wacht(200);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, letter];
      stemming = 'denk';
      if (ronde.fout(letter) === 'onthuld') {
        await spreek(teksten.hetIs);
        await spreek(o.woord, 'woord');
      } else {
        await spreek(bijna());
        await spreek(teksten.smash.nogEens);
        await spreek(o.woord, 'woord');
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    kapot = null;
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
      <div class="opdrachtkaart plaat">
        <span class="emoji">{o.emoji}</span>
        <div class="luid"><Luidspreker opTik={vraag} /></div>
      </div>

      <div class="keuzerij stenen">
        {#each o.keuzes as k, i (k)}
          <button
            class="steen"
            class:fout={fout.includes(k)}
            class:weg={kapot === k}
            class:goed={ronde.onthuld && k === o.letter}
            style="animation-delay:{i * 0.1}s"
            bind:this={steenEls[i]}
            onclick={() => sla(k, i)}
            aria-label="Letter {k}"
          >
            <span class="letter">{k}</span>
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
  .plaat {
    padding: 14px 110px 14px 50px;
  }
  .emoji {
    font-size: 150px;
    line-height: 1.1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .luid {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
  }
  .stenen {
    gap: 28px;
  }
  .steen {
    width: 190px;
    height: 190px;
    display: grid;
    place-items: center;
    border-radius: 46% 54% 44% 56% / 52% 46% 54% 48%;
    background: radial-gradient(circle at 32% 28%, #e2e8f0, #94a3b8 48%, #475569);
    border: 5px solid #1e293b;
    box-shadow: 0 10px 0 #1e293b, 0 16px 26px rgba(0, 0, 0, 0.4);
    animation: pop-in 0.4s ease-out backwards;
    transition: transform 0.1s;
  }
  .steen:active {
    transform: translateY(6px) scale(0.97);
  }
  .letter {
    font-family: var(--font-lees);
    font-size: 120px;
    font-weight: 700;
    line-height: 1;
    color: #0f172a;
    text-shadow: 0 3px 0 rgba(255, 255, 255, 0.5);
  }
  .steen.fout {
    animation: schud 0.5s ease-in-out;
    filter: grayscale(1) brightness(0.65);
    opacity: 0.55;
  }
  .steen.weg {
    visibility: hidden;
  }
  .steen.goed {
    background: radial-gradient(circle at 32% 28%, #fef9c3, #fbbf24 55%, #b45309);
    box-shadow: 0 10px 0 #7c2d12, 0 0 40px rgba(251, 191, 36, 0.9);
    animation: pop-in 0.5s ease-out;
  }
</style>
