<script lang="ts">
  /** Kies een spel van deze heldin. */
  import { onMount } from 'svelte';
  import Heldin from '../art/Held.svelte';
  import NotenTeller from '../ui/RingTeller.svelte';
  import Tekstballon from '../ui/Tekstballon.svelte';
  import characters from '../../content/characters.json';
  import teksten from '../../content/teksten.json';
  import { spellenVan, type SpelId } from '../games/spellen';
  import { vg, type HeldinId } from '../store/voortgang.svelte';
  import { spreek, stopSpreken } from '../audio/stem';
  import { speelTik } from '../audio/geluid';

  let { heldin, opKies, opTerug }: { heldin: HeldinId; opKies: (s: SpelId) => void; opTerug: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const spellen = spellenVan(heldin);
  // svelte-ignore state_referenced_locally
  const c = characters[heldin];
  let gekozen: SpelId | null = $state(null);

  onMount(() => {
    void spreek(teksten.spelkeuze);
    return stopSpreken;
  });

  /** Lucas kan nog niet lezen: de luidspreker vertelt wat het spel is. */
  function hoor(uitleg: string) {
    speelTik();
    void spreek(uitleg);
  }

  function kies(s: SpelId) {
    if (gekozen) return;
    speelTik();
    gekozen = s;
    setTimeout(() => opKies(s), 450);
  }
</script>

<div class="keuze" style="--kleur:{c.kleur}">
  <header>
    <button class="knop-rond" onclick={opTerug} aria-label="Terug">
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
        <path d="M15 5 L8 12 L15 19" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <h1>{c.naam} 🎮</h1>
    <NotenTeller aantal={vg.ringen} />
  </header>

  <div class="midden">
    <div class="heldin">
      <Tekstballon kleur={c.kleur} />
      <Heldin wie={heldin} stemming={gekozen ? 'juich' : 'rust'} hoogte={470} />
    </div>

    <div class="spellen" class:drie={spellen.length === 3}>
      {#each spellen as s, i}
        {@const niveau = vg.vaardigheden[s.id].niveau}
        <div class="spelplek" style="animation-delay:{i * 0.08}s">
        <button
          class="spel"
          class:gekozen={gekozen === s.id}
          class:weg={gekozen !== null && gekozen !== s.id}
          onclick={() => kies(s.id)}
          aria-label={s.naam}
        >
          <span class="icoon" aria-hidden="true">{s.icoon}</span>
          <span class="tekst">
            <span class="naam">{s.naam}</span>
          </span>
          <span class="labels">
            {#if s.snel}<span class="snel">💨</span>{/if}
            {#if s.maxNiveau > 0}<span class="niveau">⭐{niveau + 1}</span>{/if}
          </span>
        </button>
        <button class="hoor" onclick={() => hoor(s.uitleg)} aria-label="Wat is dit spel?">🔊</button>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .keuze {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px 28px 24px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 40px;
    text-align: center;
    text-shadow: 0 0 20px var(--kleur);
  }
  .midden {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 300px 1fr;
    align-items: end;
    gap: 20px;
  }
  .heldin {
    position: relative;
    justify-self: center;
  }
  .spellen {
    align-self: center;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
  }
  .spellen.drie {
    grid-template-columns: 1fr;
    max-width: 640px;
    width: 100%;
    justify-self: center;
  }
  .spelplek {
    position: relative;
    animation: pop-in 0.45s ease-out backwards;
  }
  .hoor {
    position: absolute;
    right: 12px;
    bottom: 12px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    font-size: 30px;
    background: rgba(255, 255, 255, 0.92);
    border: 3px solid color-mix(in srgb, var(--kleur) 70%, white);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .hoor:active {
    transform: translateY(3px);
  }
  .spel {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 18px;
    min-height: 150px;
    padding: 18px 22px;
    border-radius: 30px;
    text-align: left;
    background: linear-gradient(160deg, color-mix(in srgb, var(--kleur) 38%, #0b1640), color-mix(in srgb, var(--kleur) 18%, #0b1640));
    border: 3px solid color-mix(in srgb, var(--kleur) 70%, white);
    backdrop-filter: blur(4px);
    box-shadow: 0 0 26px color-mix(in srgb, var(--kleur) 45%, transparent), 0 8px 0 rgba(0, 0, 0, 0.25);
    transition: transform 0.15s, opacity 0.3s;
  }
  .spellen.drie .spel {
    min-height: 120px;
  }
  .spel:active {
    transform: scale(0.97);
  }
  .spel.gekozen {
    transform: scale(1.05);
    background: linear-gradient(160deg, color-mix(in srgb, var(--kleur) 60%, white), var(--kleur));
  }
  .spel.weg {
    opacity: 0.3;
  }
  .icoon {
    flex: none;
    display: grid;
    place-items: center;
    width: 108px;
    height: 108px;
    border-radius: 26px;
    font-size: 70px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: inset 0 -5px 0 rgba(0, 0, 0, 0.12);
  }
  .tekst {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .naam {
    font-size: 26px;
    padding-right: 54px;
    font-weight: 700;
    line-height: 1.1;
  }
  .labels {
    position: absolute;
    top: 10px;
    right: 14px;
    display: flex;
    gap: 6px;
  }
  .snel,
  .niveau {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 20px;
    font-weight: 700;
  }
  .snel {
    color: #422006;
    background: #fde68a;
  }
  .niveau {
    background: rgba(0, 0, 0, 0.35);
  }
</style>
