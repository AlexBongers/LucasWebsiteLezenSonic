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
  import { SPEL, type SpelId } from '../games/spellen';
  import characters from '../../content/characters.json';
  import teksten from '../../content/teksten.json';
  import { laadVoortgang, vg, type HeldinId } from '../store/voortgang.svelte';
  import { laadStemManifest, spreek, stopSpreken, zetApparaatStem } from '../audio/stem';
  import { ontgrendelGeluid, zetEffectenAan } from '../audio/geluid';

  type Scherm = 'start' | 'keuze' | 'spellen' | 'level' | 'ouder' | 'einde';
  let scherm = $state<Scherm>('start');
  let heldin = $state<HeldinId>('sonic');
  let spel = $state<SpelId>('ringrace');
  let vraagStop = $state(false);
  let wakeLock: WakeLockSentinel | null = null;
  /** Begin van deze speelbeurt (voor de pauze na 10, 15 of 20 minuten). */
  let speelStart = $state(Date.now());

  function pauzeNodig() {
    const min = vg.instellingen.sessieMinuten;
    return min > 0 && Date.now() - speelStart >= min * 60_000;
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

  onMount(() => {
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
      else if (scherm === 'ouder' || scherm === 'spellen') scherm = 'keuze';
      else if (scherm === 'keuze') vraagAfsluiten = true;
    };
    addEventListener('popstate', opTerugknop);

    const opZichtbaar = () => {
      if (document.visibilityState === 'visible' && scherm !== 'start' && scherm !== 'einde') void houdSchermAan();
      if (document.visibilityState === 'hidden') stopSpreken();
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
    heldin = h;
    scherm = 'spellen';
  }

  function kiesSpel(s: SpelId) {
    spel = s;
    heldin = SPEL[s].held;
    scherm = 'level';
  }

  /** Stoppen met spelen: uit volledig scherm, scherm mag weer uit, naar het eindscherm. */
  function afsluiten() {
    vraagAfsluiten = false;
    stopSpreken();
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

  function naarKeuze() {
    stopSpreken();
    vraagStop = false;
    scherm = 'keuze';
  }

  /** Terug naar het spelmenu van dezelfde heldin. */
  function naarSpellen() {
    stopSpreken();
    vraagStop = false;
    scherm = 'spellen';
  }
</script>

<Achtergrond {accent} />

<div class="buhne" style="transform: translate(-50%, -50%) scale({schaal})">
  {#key scherm + (scherm === 'level' ? spel : '')}
    <div class="laag" in:scale={{ start: 0.96, duration: 420, delay: 120 }} out:fade={{ duration: 180 }}>
      {#if scherm === 'start'}
        <Start opStart={begin} />
      {:else if scherm === 'keuze'}
        <HeldinKeuze opKies={kies} opOuder={() => (scherm = 'ouder')} opStoppen={() => (vraagAfsluiten = true)} />
      {:else if scherm === 'spellen'}
        <SpelKeuze {heldin} opKies={kiesSpel} opTerug={naarKeuze} />
      {:else if scherm === 'level'}
        <Level {spel} opTerug={naarSpellen} opStop={() => (vraagStop = true)} {pauzeNodig} opPauze={naarEinde} />
      {:else if scherm === 'einde'}
        <Einde sinds={speelStart} opOpnieuw={() => (scherm = 'start')} />
      {/if}
    </div>
  {/key}

  {#if vraagStop}
    <Bevestig vraag={teksten.stoppen} ja="Ja, stoppen" nee="Nee, verder!" opJa={naarSpellen} opNee={() => (vraagStop = false)} />
  {/if}
  {#if vraagAfsluiten}
    <Bevestig vraag={teksten.afsluiten} ja="Ja, stoppen" nee="Nee, verder!" opJa={afsluiten} opNee={() => (vraagAfsluiten = false)} />
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
