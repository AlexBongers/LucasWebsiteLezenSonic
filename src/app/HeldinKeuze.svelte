<script lang="ts">
  import Heldin from '../art/Held.svelte';
  import RingTeller from '../ui/RingTeller.svelte';
  import Kristal from '../ui/Kristal.svelte';
  import Maatje from '../ui/Maatje.svelte';
  import { aantalVerzameld } from '../store/plakboek.svelte';
  import OuderSlot from './OuderSlot.svelte';
  import characters from '../../content/characters.json';
  import { AANTAL_KRISTALLEN, KRISTAL_KLEUREN } from '../games/kristallen';
  import { bewaar, vg, type HeldinId } from '../store/voortgang.svelte';
  import { speelTik, zetMuziekAan } from '../audio/geluid';

  let {
    opKies,
    opMissie,
    opWinkel,
    opPlakboek,
    opKleedkamer,
    opOuder,
    opStoppen,
  }: { opKies: (h: HeldinId) => void; opMissie: () => void; opWinkel: () => void; opPlakboek: () => void; opKleedkamer: () => void; opOuder: () => void; opStoppen: () => void } = $props();

  const volgorde: HeldinId[] = ['sonic', 'tails', 'knuckles'];
  let gekozen: HeldinId | null = $state(null);
  let superheld = $derived(vg.kristallen >= AANTAL_KRISTALLEN);

  function kies(h: HeldinId) {
    if (gekozen) return;
    speelTik();
    gekozen = h;
    setTimeout(() => opKies(h), 750);
  }

  async function wisselMuziek() {
    vg.instellingen.muziek = !vg.instellingen.muziek;
    zetMuziekAan(vg.instellingen.muziek);
    await bewaar();
  }
</script>

<div class="keuze">
  <header>
    <OuderSlot opOpen={opOuder} />
    <h1>Met wie ga je oefenen?</h1>
    <div class="rechts">
      <button class="kleedknop" onclick={() => { speelTik(); opKleedkamer(); }} aria-label="Kleedkamer">
        <span>👕</span><span class="k-tekst">Aankleden</span>
      </button>
      <RingTeller aantal={vg.ringen} />
      <button class="muziek" class:uit={!vg.instellingen.muziek} onclick={wisselMuziek} aria-label="Muziek aan of uit">
        <span>{vg.instellingen.muziek ? '🎵' : '🔇'}</span>
      </button>
      <button class="stoppen" onclick={opStoppen} aria-label="Stoppen met spelen">
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
          <path d="M12 3 v8" stroke="#fff" stroke-width="2.8" stroke-linecap="round" />
          <path d="M6.3 6.8 a8 8 0 1 0 11.4 0" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round" />
        </svg>
        <span>Stoppen</span>
      </button>
    </div>
  </header>

  <div class="missie" class:super={superheld}>
    <div class="kristallen" aria-label="{vg.kristallen} van {AANTAL_KRISTALLEN} turbokristallen">
      {#each KRISTAL_KLEUREN as k, i}
        <Kristal kleur={k} grootte={28} leeg={i >= vg.kristallen} />
      {/each}
    </div>
    <div class="tekst">
      {#if superheld}
        <strong>Superheld!</strong>
        <span>Alle kristallen zijn van jou</span>
      {:else}
        <strong>Dagmissie</strong>
        <span>Drie spelletjes, één kristal</span>
      {/if}
    </div>
    <button class="knop-goud missieknop" onclick={opMissie}>🎯 Start de missie!</button>
    <button class="winkelknop" onclick={() => { speelTik(); opWinkel(); }} aria-label="Turbo-winkel">
      <span class="w-icoon">🛒</span>
      <span class="w-tekst">Winkel</span>
    </button>
    <button class="boekknop" onclick={() => { speelTik(); opPlakboek(); }} aria-label="Plakboek">
      <span class="w-icoon">📒</span>
      <span class="b-tel">{aantalVerzameld()}</span>
    </button>
    {#if vg.winkel.gekozen.maatje}<Maatje grootte={46} />{/if}
  </div>

  <div class="kaarten">
    {#each volgorde as h, i}
      {@const c = characters[h]}
      <button
        class="kaart"
        class:gekozen={gekozen === h}
        class:weg={gekozen !== null && gekozen !== h}
        class:super={superheld}
        style="--kleur:{c.kleur}; animation-delay:{i * 0.12}s"
        onclick={() => kies(h)}
      >
        <div class="figuur">
          <Heldin wie={h} stemming={gekozen === h ? 'juich' : 'rust'} hoogte={360} />
        </div>
        <div class="naambord">
          <span class="naam">{c.naam}</span>
          <span class="vak">{c.vak}</span>
          <span class="uitleg">{c.uitleg}</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .keuze {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px 28px 22px;
    gap: 12px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .rechts {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .kleedknop {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 60px;
    padding: 0 18px 0 12px;
    border-radius: 999px;
    font-size: 30px;
    background: linear-gradient(180deg, #38bdf8, #0369a1);
    border: 3px solid #e0f2fe;
    box-shadow: 0 4px 0 #0c4a6e, 0 0 18px rgba(56, 189, 248, 0.5);
  }
  .k-tekst {
    font-size: 22px;
    font-weight: 700;
  }
  .muziek {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    font-size: 30px;
    background: rgba(255, 255, 255, 0.2);
    border: 3px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }
  .muziek.uit {
    opacity: 0.6;
  }
  .stoppen {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 60px;
    padding: 0 20px 0 14px;
    border-radius: 999px;
    font-size: 22px;
    font-weight: 700;
    background: rgba(239, 68, 68, 0.75);
    border: 3px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }
  h1 {
    margin: 0;
    font-size: 44px;
    text-shadow: 0 3px 0 rgba(0, 20, 80, 0.6), 0 0 24px rgba(96, 165, 250, 0.8);
  }
  .missie {
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 8px 18px;
    border-radius: 26px;
    background: linear-gradient(90deg, rgba(0, 20, 80, 0.55), rgba(0, 40, 120, 0.4));
    border: 3px solid rgba(253, 230, 138, 0.55);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
  }
  .missie.super {
    border-color: #fde047;
    box-shadow: 0 0 36px rgba(253, 224, 71, 0.8);
    animation: puls 2s ease-in-out infinite;
  }
  .kristallen {
    display: flex;
    gap: 6px;
  }
  .tekst {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }
  .tekst strong {
    font-size: 30px;
    color: #fde68a;
  }
  .tekst span {
    font-size: 20px;
    color: #dbeafe;
  }
  .missieknop {
    min-height: 64px;
    padding: 0 20px;
    font-size: 26px;
    white-space: nowrap;
    animation: puls 1.8s ease-in-out infinite;
  }
  .winkelknop {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 64px;
    padding: 0 14px 0 16px;
    border-radius: 999px;
    font-size: 26px;
    font-weight: 700;
    background: linear-gradient(180deg, #8b5cf6, #5b21b6);
    border: 3px solid #ddd6fe;
    box-shadow: 0 6px 0 #3b0f7a, 0 0 22px rgba(167, 139, 250, 0.6);
  }
  .boekknop {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 64px;
    padding: 0 16px;
    border-radius: 999px;
    font-size: 26px;
    font-weight: 700;
    background: linear-gradient(180deg, #f472b6, #be185d);
    border: 3px solid #fce7f3;
    box-shadow: 0 6px 0 #831843, 0 0 22px rgba(244, 114, 182, 0.5);
  }
  .boekknop:active {
    transform: translateY(4px);
  }
  .winkelknop:active {
    transform: translateY(4px);
  }
  .w-icoon {
    font-size: 30px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .kaarten {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .kaart {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    padding: 0 0 14px;
    border-radius: 36px;
    background:
      radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--kleur) 55%, transparent), transparent 70%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03));
    border: 3px solid color-mix(in srgb, var(--kleur) 70%, white);
    box-shadow: 0 0 30px color-mix(in srgb, var(--kleur) 50%, transparent), inset 0 0 40px rgba(255, 255, 255, 0.05);
    animation: kaart-in 0.6s ease-out backwards;
    transition: transform 0.3s, opacity 0.3s;
  }
  .kaart::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-conic-gradient(from 0deg at 50% 62%, rgba(255, 255, 255, 0.07) 0 8deg, transparent 8deg 22deg);
    animation: draai 40s linear infinite;
  }
  .kaart.super {
    border-color: #fde047;
    box-shadow: 0 0 44px rgba(253, 224, 71, 0.75), inset 0 0 40px rgba(253, 224, 71, 0.15);
  }
  .kaart.super .figuur {
    filter: drop-shadow(0 0 22px rgba(253, 224, 71, 0.95));
  }
  .kaart:active {
    transform: scale(0.97);
  }
  .kaart.gekozen {
    transform: scale(1.05);
  }
  .kaart.weg {
    opacity: 0.25;
    transform: scale(0.94);
  }
  .figuur {
    position: relative;
    margin-bottom: -4px;
  }
  .naambord {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 26px 8px;
    border-radius: 22px;
    background: rgba(3, 18, 60, 0.6);
    border: 2px solid color-mix(in srgb, var(--kleur) 60%, white);
  }
  .naam {
    font-size: 46px;
    font-weight: 700;
    line-height: 1.05;
    text-shadow: 0 0 18px var(--kleur);
  }
  .vak {
    font-size: 26px;
    font-weight: 600;
    color: #fde68a;
  }
  .uitleg {
    font-size: 19px;
    color: #dbeafe;
  }
  @keyframes kaart-in {
    from { transform: translateY(60px) scale(0.9); opacity: 0; }
  }
  @keyframes draai {
    to { transform: rotate(360deg); }
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.04); }
  }
</style>
