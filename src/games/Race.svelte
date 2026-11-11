<script lang="ts">
  /**
   * Sonic: Ring-race (een letter flitst) en Woord-race (een woordje flitst).
   * Tik op de ring, kijk goed naar de flits en kies dan de letter of het plaatje.
   * De flitstijd wordt korter als het goed gaat; er loopt nooit een klok.
   */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import { FLITS_MAX, FLITS_MIN, nieuweFlitstijd, type RingOpgave, type WoordRaceOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik } from '../audio/geluid';
  import { glitterOp } from '../ui/feest';
  import { vg } from '../store/voortgang.svelte';
  import { teksten, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import { flitsMaal } from './uitrusting.svelte';
  import type { SpelProps } from './types';

  type Opgave = RingOpgave | WoordRaceOpgave;
  let { spel = 'ringrace', opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<Opgave> = $props();

  // svelte-ignore state_referenced_locally
  const letters = spel === 'ringrace';
  // svelte-ignore state_referenced_locally
  const tekst = letters ? teksten.ringrace : teksten.woordrace;
  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<Opgave>(opgaven as Gepland<Opgave>[], { opKlaar, opVoortgang });

  type Fase = 'klaar' | 'flits' | 'kiezen' | 'wacht' | 'goed' | 'onthuld';
  let fase = $state<Fase>('klaar');
  let fout: string[] = $state([]);
  let stemming: 'rust' | 'dans' | 'juich' | 'denk' = $state('rust');
  let podiumEl: HTMLElement | undefined = $state();
  let knopEls: HTMLElement[] = $state([]);

  let o = $derived(ronde.huidig);
  let inhoud = $derived(letters ? (o as RingOpgave).letter : (o as WoordRaceOpgave).woord);
  let zichtbaar = $derived(fase === 'flits' || fase === 'goed' || fase === 'onthuld');
  let maat = $derived(letters ? 210 : Math.min(130, Math.floor(560 / inhoud.length)));
  let bliksems = $derived(Math.max(1, Math.ceil(((FLITS_MAX - vg.flitstijd) / (FLITS_MAX - FLITS_MIN)) * 5)));

  onMount(() => {
    void spreek(tekst.start);
  });

  async function flits(duur: number) {
    speelTik();
    fase = 'flits';
    await wacht(duur * flitsMaal());
    fase = 'kiezen';
    void spreek(tekst.vraag);
  }

  async function kies(sleutel: string, i: number) {
    if (fase !== 'kiezen' || fout.includes(sleutel)) return;
    const eerste = !ronde.rij[ronde.index].herhaling;
    if (sleutel === inhoud) {
      fase = 'goed';
      speelGoed();
      glitterOp(podiumEl ?? null);
      stemming = 'juich';
      if (eerste && ronde.pogingen === 0) vg.flitstijd = nieuweFlitstijd(vg.flitstijd, true);
      opRingen(ronde.goed(), podiumEl);
      // De stem zegt het woord erbij: bij een letter het beginwoord ("maan" bij de m).
      await spreek(letters ? (o as RingOpgave).woord : (o as WoordRaceOpgave).woord, 'woord');
      await spreek(compliment('sonic'));
      await wacht(200);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, sleutel];
      stemming = 'denk';
      if (eerste && ronde.pogingen === 0) vg.flitstijd = nieuweFlitstijd(vg.flitstijd, false);
      if (ronde.fout(sleutel) === 'onthuld') {
        fase = 'onthuld';
        await spreek(teksten.hetIs);
        await spreek(letters ? (o as RingOpgave).woord : (o as WoordRaceOpgave).woord, 'woord');
      } else {
        fase = 'wacht';
        await wacht(500);
        await spreek(tekst.nogEens);
        stemming = 'rust';
        await flits(Math.min(FLITS_MAX, vg.flitstijd * 1.7));
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    stemming = 'rust';
    fase = 'klaar';
  }
</script>

<div class="spelvlak">
  <div class="heldin-plek">
    <Tekstballon kleur="#2563eb" />
    <Held wie="sonic" {stemming} hoogte={400} />
  </div>

  <div class="speelveld">
    <div class="snelheid" aria-label="Flitssnelheid {bliksems} van 5">
      <span>Snelheid</span>
      {#each [1, 2, 3, 4, 5] as b}<span class="bliksem" class:aan={b <= bliksems}>💨</span>{/each}
    </div>

    <div class="portaal" class:flits={fase === 'flits'} bind:this={podiumEl}>
      <div class="ring"></div>
      {#if fase === 'klaar'}
        {#key ronde.nummer}
          <button class="start" onclick={() => flits(vg.flitstijd)} aria-label="Laat zien">
            <span class="bliksemgroot">⚡</span>
            <span>Tik!</span>
          </button>
        {/key}
      {:else if zichtbaar}
        <div class="inhoud leeswoord" style="font-size:{maat}px">{inhoud}</div>
        {#if fase === 'goed' || fase === 'onthuld'}<div class="plaatje">{o.emoji}</div>{/if}
      {:else}
        <div class="inhoud vraag">?</div>
      {/if}
    </div>

    <div class="keuzerij" class:zichtbaar={fase === 'kiezen' || fase === 'goed' || fase === 'onthuld'}>
      {#if letters}
        {#each (o as RingOpgave).keuzes as k, i (k)}
          <button
            class="keuzeknop letter"
            class:fout={fout.includes(k)}
            class:goed={(fase === 'goed' || fase === 'onthuld') && k === inhoud}
            style="animation-delay:{i * 0.1}s"
            bind:this={knopEls[i]}
            disabled={fase !== 'kiezen'}
            onclick={() => kies(k, i)}>{k}</button
          >
        {/each}
      {:else}
        {#each (o as WoordRaceOpgave).keuzes as k, i (k.woord)}
          <button
            class="keuzeknop emoji"
            class:fout={fout.includes(k.woord)}
            class:goed={(fase === 'goed' || fase === 'onthuld') && k.woord === inhoud}
            style="animation-delay:{i * 0.1}s"
            bind:this={knopEls[i]}
            disabled={fase !== 'kiezen'}
            onclick={() => kies(k.woord, i)}
            aria-label="Plaatje {i + 1}">{k.emoji}</button
          >
        {/each}
      {/if}
    </div>

    {#if fase === 'onthuld'}
      <button class="knop-goud verder-knop" onclick={volgende}>Verder ➜</button>
    {/if}
  </div>
</div>

<style>
  .snelheid {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 18px;
    border-radius: 999px;
    font-size: 22px;
    background: rgba(0, 20, 70, 0.5);
  }
  .bliksem {
    opacity: 0.25;
    filter: grayscale(1);
  }
  .bliksem.aan {
    opacity: 1;
    filter: none;
  }
  .portaal {
    position: relative;
    display: grid;
    place-items: center;
    width: 340px;
    height: 340px;
  }
  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 26px solid transparent;
    background:
      radial-gradient(circle, rgba(0, 30, 100, 0.55) 60%, transparent 61%) padding-box,
      conic-gradient(#fff7c2, #fbbf24, #b45309, #fbbf24, #fff7c2) border-box;
    box-shadow: 0 0 40px rgba(251, 191, 36, 0.7), inset 0 0 30px rgba(0, 0, 0, 0.4);
  }
  .portaal.flits .ring {
    box-shadow: 0 0 90px 20px rgba(255, 247, 194, 0.95), inset 0 0 40px rgba(255, 255, 255, 0.5);
  }
  .inhoud {
    position: relative;
    z-index: 1;
    animation: flits-in 0.12s ease-out;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.7);
  }
  .vraag {
    font-size: 150px;
    font-weight: 700;
    color: #fde68a;
    animation: none;
  }
  .plaatje {
    position: absolute;
    right: -30px;
    bottom: -10px;
    font-size: 92px;
    z-index: 2;
    animation: pop-in 0.5s ease-out;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .start {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 54px;
    font-weight: 700;
    color: #fff7c2;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.4);
    animation: puls 1.2s ease-in-out infinite;
  }
  .bliksemgroot {
    font-size: 110px;
    line-height: 1;
    filter: drop-shadow(0 0 16px #fde047);
  }
  .keuzerij {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  .keuzerij.zichtbaar {
    opacity: 1;
    pointer-events: auto;
  }
  .letter {
    min-width: 190px;
    font-size: 110px;
    line-height: 1;
    padding: 14px 24px;
    font-family: var(--font-lees);
  }
  .emoji {
    width: 190px;
    font-size: 100px;
    line-height: 1;
    padding: 12px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  @keyframes flits-in {
    from { transform: scale(0.5); opacity: 0; }
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
</style>
