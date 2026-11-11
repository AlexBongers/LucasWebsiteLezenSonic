<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import Achtergrond from '../ui/Achtergrond.svelte';
  import Bevestig from '../ui/Bevestig.svelte';
  import Start from './Start.svelte';
  import HeldinKeuze from './HeldinKeuze.svelte';
  import Level from './Level.svelte';
  import Ouderhoek from './Ouderhoek.svelte';
  import Einde from './Einde.svelte';
  import SpelKeuze from './SpelKeuze.svelte';
  import KristalScherm from './KristalScherm.svelte';
  import Winkel from './Winkel.svelte';
  import Plakboek from './Plakboek.svelte';
  import Kleedkamer from './Kleedkamer.svelte';
  import { verdien } from '../store/winkel.svelte';
  import { RINGEN_KRISTAL, type Soort } from '../games/winkel';
  import { SPEL, SPELLEN, type HeldId, type SpelId } from '../games/spellen';
  import { WERELD_VAN } from '../ui/werelden';
  import characters from '../../content/characters.json';
  import teksten from '../../content/teksten.json';
  import { bewaar, laadVoortgang, vg, type HeldinId } from '../store/voortgang.svelte';
  import { laadStemManifest, spreek, stopSpreken, zetApparaatStem } from '../audio/stem';
  import { ontgrendelGeluid, pauzeerGeluid, speelWhoosh, startMuziek, stopMuziek, zetEffectenAan } from '../audio/geluid';

  type Scherm = 'start' | 'keuze' | 'spellen' | 'level' | 'kristal' | 'ouder' | 'einde' | 'winkel' | 'plakboek' | 'kleedkamer';
  let scherm = $state<Scherm>('start');
  let heldin = $state<HeldinId>('sonic');
  let spel = $state<SpelId>('ringrace');
  let vraagStop = $state(false);
  let wakeLock: WakeLockSentinel | null = null;
  /** Begin van deze speelbeurt (voor de pauze na 10, 15 of 20 minuten). */
  let speelStart = $state(Date.now());

  /** De dagmissie: drie spelletjes, een van elke held. */
  type Missie = { spellen: SpelId[]; stap: number };
  let missie = $state<Missie | null>(null);
  let nieuwKristal = $state(0);

  function pauzeNodig() {
    const min = vg.instellingen.sessieMinuten;
    return !missie && min > 0 && Date.now() - speelStart >= min * 60_000;
  }

  /** Alles staat op een vast podium van 1280 x 800 dat meeschaalt met het scherm. */
  const BREED = 1280;
  const HOOG = 800;
  let schaal = $state(1);
  function meet() {
    const w = window.visualViewport?.width ?? innerWidth;
    const h = window.visualViewport?.height ?? innerHeight;
    schaal = Math.min(w / BREED, h / HOOG);
  }
  let vraagAfsluiten = $state(false);

  let accent = $derived(scherm === 'level' || scherm === 'spellen' ? characters[heldin].kleur : '#3b82f6');
  /** Elke held heeft zijn eigen wereld: de heuvel, de werkplaats of de ruïnes. */
  let wereld = $derived(
    vg.winkel.gekozen.wereld === 'ruimte' ? 'ruimte' : scherm === 'level' || scherm === 'spellen' ? WERELD_VAN[heldin as HeldId] : 'heuvel',
  );

  // Een snelle veeg tussen schermen (snelheidsstrepen).
  let veeg = $state(0);
  let vorigScherm: Scherm = 'start';
  $effect(() => {
    const nu = scherm;
    if (nu !== vorigScherm) {
      if (vorigScherm !== 'start' || nu !== 'keuze') speelWhoosh();
      veeg++;
      vorigScherm = nu;
    }
  });

  onMount(() => {
    // Alleen tijdens het ontwikkelen: handig om in de browser mee te testen.
    if (import.meta.env.DEV) (window as unknown as { __vg: typeof vg }).__vg = vg;
    void laadVoortgang().then(() => {
      zetApparaatStem(vg.instellingen.apparaatStem);
      zetEffectenAan(vg.instellingen.effecten);
    });
    void laadStemManifest();
    meet();
    addEventListener('resize', meet);
    window.visualViewport?.addEventListener('resize', meet);

    // Android-terugknop: tijdens het spelen netjes terug; op het startscherm de app uit.
    history.replaceState({ basis: true }, '');
    history.pushState({ app: true }, '');
    const opTerugknop = () => {
      if (scherm === 'start' || scherm === 'einde') {
        // Nog een stap terug: dan sluit Android de app.
        history.back();
        return;
      }
      history.pushState({ app: true }, '');
      if (scherm === 'level') vraagStop = true;
      else if (scherm === 'ouder' || scherm === 'spellen' || scherm === 'winkel' || scherm === 'plakboek' || scherm === 'kleedkamer') scherm = 'keuze';
      else if (scherm === 'kristal') scherm = 'keuze';
      else if (scherm === 'keuze') vraagAfsluiten = true;
    };
    addEventListener('popstate', opTerugknop);

    const opZichtbaar = () => {
      if (document.visibilityState === 'visible') {
        pauzeerGeluid(false);
        if (scherm !== 'start' && scherm !== 'einde') void houdSchermAan();
      }
      if (document.visibilityState === 'hidden') {
        stopSpreken();
        pauzeerGeluid(true);
      }
    };
    document.addEventListener('visibilitychange', opZichtbaar);

    return () => {
      removeEventListener('popstate', opTerugknop);
      removeEventListener('resize', meet);
      window.visualViewport?.removeEventListener('resize', meet);
      document.removeEventListener('visibilitychange', opZichtbaar);
    };
  });

  async function houdSchermAan() {
    try {
      wakeLock = await navigator.wakeLock?.request('screen');
    } catch {
      wakeLock = null;
    }
  }

  async function begin() {
    ontgrendelGeluid();
    if (vg.instellingen.muziek) startMuziek();
    // Volledig scherm en liggend vastzetten op de achtergrond: nooit wachten,
    // want op sommige apparaten komt er geen antwoord en dan zou de app blijven hangen.
    void (async () => {
      try {
        if (!vg.instellingen.volledigScherm) return;
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        }
        await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
      } catch {
        // Volledig scherm of draaien vastzetten mag niet overal; geen probleem.
      }
    })();
    void houdSchermAan();
    speelStart = Date.now();
    scherm = 'keuze';
    void spreek(teksten.welkom);
  }

  function kies(h: HeldinId) {
    missie = null;
    heldin = h;
    scherm = 'spellen';
  }

  function kiesSpel(s: SpelId) {
    missie = null;
    spel = s;
    heldin = SPEL[s].held;
    scherm = 'level';
  }

  // ---------- Dagmissie ----------
  /** Per held een spel; liever een spel dat nog weinig gespeeld is. */
  function kiesMissieSpellen(): SpelId[] {
    return (['sonic', 'tails', 'knuckles'] as HeldId[]).map((h) => {
      const van = SPELLEN.filter((x) => x.held === h);
      const gespeeld = (id: SpelId) => vg.sessies.filter((x) => x.spel === id).length + Math.random() * 1.5;
      return van.sort((a, b) => gespeeld(a.id) - gespeeld(b.id))[0].id;
    });
  }

  function startMissie() {
    stopSpreken();
    missie = { spellen: kiesMissieSpellen(), stap: 0 };
    zetMissieSpel();
    scherm = 'level';
    void spreek(teksten.missie.start);
  }

  function zetMissieSpel() {
    if (!missie) return;
    spel = missie.spellen[missie.stap];
    heldin = SPEL[spel].held;
  }

  /** Na een spel van de missie: het volgende, of het kristal als ze alle drie klaar zijn. */
  function missieVerder() {
    if (!missie) return;
    stopSpreken();
    if (missie.stap + 1 < missie.spellen.length) {
      missie = { ...missie, stap: missie.stap + 1 };
      zetMissieSpel();
      return;
    }
    missie = null;
    vg.missies++;
    vg.kristallen = Math.min(7, vg.kristallen + 1);
    nieuwKristal = vg.kristallen;
    verdien(RINGEN_KRISTAL);
    void bewaar();
    scherm = 'kristal';
  }

  /** Stoppen met spelen: uit volledig scherm, scherm mag weer uit, naar het eindscherm. */
  function afsluiten() {
    vraagAfsluiten = false;
    stopSpreken();
    stopMuziek();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    wakeLock?.release().catch(() => {});
    wakeLock = null;
    scherm = vg.sessies.some((s) => new Date(s.datum).getTime() >= speelStart) ? 'einde' : 'start';
  }

  function naarEinde() {
    stopSpreken();
    wakeLock?.release().catch(() => {});
    wakeLock = null;
    scherm = 'einde';
  }

  let winkelTab = $state<Soort>('power');
  function naarWinkel(tab: Soort = 'power') {
    winkelTab = tab;
    stopSpreken();
    vraagStop = false;
    missie = null;
    scherm = 'winkel';
  }

  function naarKleedkamer() {
    stopSpreken();
    missie = null;
    scherm = 'kleedkamer';
  }

  function naarPlakboek() {
    stopSpreken();
    vraagStop = false;
    missie = null;
    scherm = 'plakboek';
  }

  function naarKeuze() {
    stopSpreken();
    vraagStop = false;
    missie = null;
    scherm = 'keuze';
  }

  /** Terug naar het spelmenu van dezelfde heldin (of na een mislukte missie naar de keuze). */
  function naarSpellen() {
    stopSpreken();
    vraagStop = false;
    if (missie) {
      missie = null;
      scherm = 'keuze';
    } else scherm = 'spellen';
  }
</script>

<Achtergrond {accent} {wereld} />

<div class="buhne" style="transform: translate(-50%, -50%) scale({schaal})">
  {#key scherm + (scherm === 'level' ? spel : '')}
    <div class="laag" in:scale={{ start: 0.96, duration: 420, delay: 120 }} out:fade={{ duration: 180 }}>
      {#if scherm === 'start'}
        <Start opStart={begin} />
      {:else if scherm === 'keuze'}
        <HeldinKeuze opKies={kies} opMissie={startMissie} opWinkel={naarWinkel} opPlakboek={naarPlakboek} opKleedkamer={naarKleedkamer} opOuder={() => (scherm = 'ouder')} opStoppen={() => (vraagAfsluiten = true)} />
      {:else if scherm === 'spellen'}
        <SpelKeuze {heldin} opKies={kiesSpel} opTerug={naarKeuze} />
      {:else if scherm === 'level'}
        <Level
          {spel}
          missie={missie ? { stap: missie.stap, totaal: missie.spellen.length } : null}
          opVerder={missieVerder}
          opTerug={naarSpellen}
          opWinkel={naarWinkel}
          opPlakboek={naarPlakboek}
          opStop={() => (vraagStop = true)}
          {pauzeNodig}
          opPauze={naarEinde}
        />
      {:else if scherm === 'kleedkamer'}
        <Kleedkamer opSluit={naarKeuze} />
      {:else if scherm === 'plakboek'}
        <Plakboek opSluit={naarKeuze} opWinkel={() => naarWinkel('sticker')} />
      {:else if scherm === 'winkel'}
        <Winkel opSluit={naarKeuze} startTab={winkelTab} />
      {:else if scherm === 'kristal'}
        <KristalScherm nummer={nieuwKristal} opSluit={naarKeuze} />
      {:else if scherm === 'einde'}
        <Einde sinds={speelStart} opOpnieuw={() => (scherm = 'start')} />
      {/if}
    </div>
  {/key}

  {#key veeg}
    {#if veeg > 1}<div class="veeg" aria-hidden="true"></div>{/if}
  {/key}

  {#if vraagStop}
    <Bevestig vraag={teksten.stoppen} ja="🏠" nee="▶️" opJa={naarSpellen} opNee={() => (vraagStop = false)} />
  {/if}
  {#if vraagAfsluiten}
    <Bevestig vraag={teksten.afsluiten} ja="🏠" nee="▶️" opJa={afsluiten} opNee={() => (vraagAfsluiten = false)} />
  {/if}
</div>

<!-- De ouderhoek gebruikt het hele scherm en mag scrollen -->
{#if scherm === 'ouder'}
  <Ouderhoek opSluit={() => (scherm = 'keuze')} />
{/if}

<div class="draai" aria-hidden={true}>
  <div class="tablet">📱</div>
  <p>{teksten.draaien}</p>
</div>

<style>
  .buhne {
    position: fixed;
    left: 50%;
    top: 50%;
    width: 1280px;
    height: 800px;
    transform-origin: center;
  }
  .veeg {
    position: absolute;
    inset: -10%;
    z-index: 60;
    pointer-events: none;
    background:
      repeating-linear-gradient(105deg, transparent 0 34px, rgba(255, 255, 255, 0.55) 34px 38px, transparent 38px 90px),
      linear-gradient(105deg, rgba(37, 99, 235, 0.9), rgba(251, 191, 36, 0.8));
    clip-path: polygon(0 0, 0 0, -12% 100%, -12% 100%);
    animation: wipe 0.55s cubic-bezier(0.7, 0, 0.3, 1) forwards;
  }
  @keyframes wipe {
    0% { clip-path: polygon(-10% 0, -10% 0, -22% 100%, -22% 100%); opacity: 1; }
    45% { clip-path: polygon(-10% 0, 120% 0, 108% 100%, -22% 100%); opacity: 1; }
    100% { clip-path: polygon(112% 0, 122% 0, 110% 100%, 100% 100%); opacity: 1; }
  }
  .laag {
    position: absolute;
    inset: 0;
  }
  .draai {
    display: none;
  }
  @media (orientation: portrait) and (max-width: 1000px) {
    .draai {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      background: #0b2a6f;
      font-size: 32px;
      text-align: center;
      padding: 40px;
    }
    .tablet {
      font-size: 120px;
      animation: draai 2s ease-in-out infinite;
    }
  }
  @keyframes draai {
    0%, 30% { transform: rotate(0); }
    60%, 100% { transform: rotate(-90deg); }
  }
</style>
