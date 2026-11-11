<script lang="ts">
  /**
   * Knuckles: Kluis-kraker (groep 3, uitdagend). De stem zegt een woord; in het woord op de kluis mist een letter.
   * Kies de goede letter en de kluis zwaait open met een schat erin.
   */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { KluisOpgave } from '../engine/kluis';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelKristal } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<KluisOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<KluisOpgave>(opgaven as Gepland<KluisOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: string[] = $state([]);
  let open = $state(false);
  let schud = $state(false);
  let bezig = $state(false);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let kluisEl: HTMLElement | undefined = $state();
  let hint = $derived(ronde.pogingen > 0 && !open);
  const SCHAT = ['💎', '👑', '🪙', '💰', '🏆'];
  let schat = $derived(SCHAT[ronde.nummer % SCHAT.length]);

  onMount(() => {
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.kluis.start);
      await vraag();
    })();
  });

  async function vraag() {
    await spreek(teksten.kluis.vraag);
    await spreek(o.woord, 'woord');
  }

  async function kies(k: string) {
    if (bezig || open || fout.includes(k)) return;
    if (k === o.antwoord) {
      bezig = true;
      open = true;
      stemming = 'juich';
      speelGoed();
      setTimeout(speelKristal, 350);
      boem(kluisEl, 220);
      opRingen(ronde.goed(), kluisEl);
      await spreek(teksten.kluis.klaar);
      await spreek(o.woord, 'woord');
      await spreek(compliment('knuckles'));
      await wacht(400);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, k];
      stemming = 'denk';
      schud = true;
      setTimeout(() => (schud = false), 500);
      if (ronde.fout(k) === 'onthuld') {
        bezig = true;
        open = true;
        await spreek(teksten.hetIs);
        await spreek(o.woord, 'woord');
        await wacht(1200);
        volgende();
      } else {
        await spreek(bijna());
        await spreek(teksten.kluis.hint);
        await spreek(o.woord, 'woord');
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    open = false;
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
      <div class="opdrachtkaart plaatje">
        <span class="emoji">{o.emoji}</span>
        <div class="luid"><Luidspreker opTik={vraag} /></div>
      </div>

      <div class="kluis" class:schud class:open bind:this={kluisEl}>
        <div class="binnen" aria-hidden="true">
          <span class="schat">{schat}</span>
          <span class="munten">🪙🪙🪙</span>
        </div>
        <div class="deur">
          <div class="code">
            {#each o.delen as d, i}
              {#if i === o.gat}
                <span class="tegel gat" class:hint class:gevuld={open}>{open ? o.antwoord : '?'}</span>
              {:else}
                <span class="tegel">{d}</span>
              {/if}
            {/each}
          </div>
          <div class="wiel" aria-hidden="true">
            {#each [0, 45, 90, 135] as r}<i style="transform: rotate({r}deg)"></i>{/each}
          </div>
          <span class="bout b1"></span><span class="bout b2"></span><span class="bout b3"></span><span class="bout b4"></span>
        </div>
      </div>

      <div class="keuzerij">
        {#each o.keuzes as k, i (k)}
          <button
            class="letterknop"
            class:fout={fout.includes(k)}
            class:goed={open && k === o.antwoord}
            style="animation-delay:{i * 0.1}s"
            onclick={() => kies(k)}
            aria-label="Letter {k}">{k}</button
          >
        {/each}
      </div>
    {/key}
  </div>
</div>

<style>
  .plaatje {
    padding: 4px 100px 4px 40px;
  }
  .emoji {
    font-size: 96px;
    line-height: 1.1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .luid {
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%);
  }
  .kluis {
    position: relative;
    width: 560px;
    height: 300px;
    perspective: 1200px;
  }
  .binnen {
    position: absolute;
    inset: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 26px;
    background: radial-gradient(circle at 50% 40%, #fde68a, #b45309 70%, #431407);
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.7);
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .schat {
    font-size: 110px;
    filter: drop-shadow(0 0 24px #fde047);
  }
  .munten {
    font-size: 44px;
  }
  .open .schat {
    animation: pop-in 0.6s ease-out 0.35s backwards;
  }
  .deur {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 28px;
    border-radius: 30px;
    background:
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0 3px, transparent 3px 14px),
      linear-gradient(160deg, #94a3b8, #475569 55%, #1e293b);
    border: 8px solid #334155;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45), inset 0 0 0 4px rgba(255, 255, 255, 0.15);
    transform-origin: left center;
    transform-style: preserve-3d;
    transition: transform 0.9s cubic-bezier(0.3, 1.2, 0.5, 1);
  }
  .open .deur {
    transform: rotateY(-105deg);
  }
  /* De achterkant van de deur is gewoon staal: geen letters in spiegelbeeld */
  .deur > * {
    backface-visibility: hidden;
  }
  .schud .deur {
    animation: schud 0.45s;
    box-shadow: 0 0 40px rgba(239, 68, 68, 0.9), inset 0 0 0 4px rgba(239, 68, 68, 0.6);
  }
  .code {
    display: flex;
    gap: 10px;
    padding: 14px;
    border-radius: 20px;
    background: #0f172a;
    box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.8);
  }
  .tegel {
    display: grid;
    place-items: center;
    min-width: 92px;
    height: 112px;
    padding: 0 10px;
    border-radius: 14px;
    font-family: var(--font-lees);
    font-size: 80px;
    font-weight: 700;
    color: #bbf7d0;
    background: #052e16;
    text-shadow: 0 0 14px #4ade80;
  }
  .gat {
    color: #fde68a;
    background: #422006;
    border: 4px dashed #fde68a;
    text-shadow: 0 0 14px #fbbf24;
    animation: puls 1.1s ease-in-out infinite;
  }
  .gat.hint {
    box-shadow: 0 0 26px #fbbf24;
  }
  .gat.gevuld {
    border-style: solid;
    animation: pop-in 0.4s ease-out;
  }
  .wiel {
    position: relative;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: radial-gradient(circle, #e2e8f0 30%, #64748b 32%, #94a3b8 70%, #334155 72%);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.4);
    transition: transform 0.8s;
  }
  .open .wiel {
    transform: rotate(270deg);
  }
  .wiel i {
    position: absolute;
    left: 44px;
    top: -6px;
    width: 8px;
    height: 108px;
    border-radius: 4px;
    background: #cbd5e1;
  }
  .bout {
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #f1f5f9, #475569);
  }
  .b1 { left: 14px; top: 14px; }
  .b2 { right: 14px; top: 14px; }
  .b3 { left: 14px; bottom: 14px; }
  .b4 { right: 14px; bottom: 14px; }
  .letterknop {
    min-width: 150px;
    height: 140px;
    padding: 0 18px;
    border-radius: 30px;
    font-family: var(--font-lees);
    font-size: 96px;
    font-weight: 700;
    line-height: 1;
    color: #3b1d00;
    background: linear-gradient(180deg, #fff7c2, #fbbf24);
    border: 5px solid #fff;
    box-shadow: 0 8px 0 #92400e, 0 14px 22px rgba(0, 0, 0, 0.35);
    animation: pop-in 0.4s ease-out backwards;
  }
  .letterknop:active {
    transform: translateY(5px);
  }
  .letterknop.fout {
    filter: grayscale(1) brightness(0.65);
    opacity: 0.6;
  }
  .letterknop.goed {
    background: linear-gradient(180deg, #bbf7d0, #22c55e);
    box-shadow: 0 0 30px #4ade80, 0 8px 0 #166534;
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }
  @keyframes schud {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-14px); }
    40% { transform: translateX(12px); }
    60% { transform: translateX(-8px); }
    80% { transform: translateX(5px); }
  }
</style>
