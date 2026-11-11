<script lang="ts">
  /**
   * Eén ronde van één spel: plant de opgaven (auditie, herhaling, eigen niveau, makkelijke opwarmer),
   * telt de ringen en verwerkt het resultaat (niveau, herhalingsdoosjes, overzicht).
   */
  import Race from '../games/Race.svelte';
  import Smash from '../games/Smash.svelte';
  import Bouwen from '../games/Bouwen.svelte';
  import Katapult from '../games/Katapult.svelte';
  import TelBouw from '../games/TelBouw.svelte';
  import Meer from '../games/Meer.svelte';
  import Patroon from '../games/Patroon.svelte';
  import Splits from '../games/Splits.svelte';
  import Jacht from '../games/Jacht.svelte';
  import Tunnel from '../games/Tunnel.svelte';
  import TorenSmash from '../games/TorenSmash.svelte';
  import TorenBoem from '../games/TorenBoem.svelte';
  import PatroonBaan from '../games/PatroonBaan.svelte';
  import MuurBouwer from '../games/MuurBouwer.svelte';
  import BomSplits from '../games/BomSplits.svelte';
  import Meer3D from '../games/Meer3D.svelte';
  import Jacht3D from '../games/Jacht3D.svelte';
  import WoordRace3D from '../games/WoordRace3D.svelte';
  import Kluis from '../games/Kluis.svelte';
  import { webglKan } from '../ui/drie-d';
  import SchildBalk from '../ui/SchildBalk.svelte';
  import RingTeller from '../ui/RingTeller.svelte';
  import Beloning from './Beloning.svelte';
  import characters from '../../content/characters.json';
  import { REKEN_REGELS, verwerkSessie } from '../engine/adaptief';
  import { aanDeBeurt, verwerkAntwoord } from '../engine/herhaling';
  import { auditieUitslag, planAuditie, planSessie, type Gepland, type Resultaat } from '../engine/sessie';
  import { werkStatsBij } from '../engine/overzicht';
  import { maakKent } from '../engine/generator-lucas';
  import { auditieNiveaus, SPEL, type SpelId } from '../games/spellen';
  import { bewaar, vg } from '../store/voortgang.svelte';
  import { spreek, stopSpreken } from '../audio/stem';
  import { speelBliksem, speelCombo, speelHart } from '../audio/geluid';
  import { zetCombo } from '../games/teksten';
  import { vliegRingen } from '../ui/vlieg';
  import { onDestroy } from 'svelte';
  import Uitrusting from '../ui/Uitrusting.svelte';
  import Maatje from '../ui/Maatje.svelte';
  import RingPrijs from '../ui/RingPrijs.svelte';
  import { nieuweRonde, uitrusting } from '../games/uitrusting.svelte';
  import { ARTIKEL } from '../games/winkel';
  import { pakPowerup } from '../store/winkel.svelte';
  import { geefSticker, type StickerWinst } from '../store/plakboek.svelte';
  import teksten from '../../content/teksten.json';

  let {
    spel,
    opTerug,
    opStop,
    pauzeNodig = () => false,
    opPauze = opTerug,
    missie = null,
    opVerder = () => {},
    opWinkel = () => {},
    opPlakboek = () => {},
  }: {
    spel: SpelId;
    /** Bij een dagmissie: korte rondes zonder proefrondje, en daarna door naar het volgende spel. */
    missie?: { stap: number; totaal: number } | null;
    opVerder?: () => void;
    /** Naar de Turbo-winkel (vanuit het eindscherm). */
    opWinkel?: () => void;
    /** Naar het plakboek (vanuit het eindscherm). */
    opPlakboek?: () => void;
    opTerug: () => void;
    opStop: () => void;
    /** Is de speeltijd om? Dan volgt na deze ronde een pauze. */
    pauzeNodig?: () => boolean;
    opPauze?: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  const def = SPEL[spel];
  const held = def.held;

  let ronde = $state(0);
  let voortgang = $state(0);
  let verdiend = $state(0);
  let sticker: StickerWinst | null = $state(null);
  /** Een korte melding midden boven in beeld, bijv. bij het aanzetten van een powerup. */
  let toast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let start = Date.now();
  let afgerond = false;
  let uitslag: {
    goed: number;
    totaal: number;
    omhoog: boolean;
    titel?: string;
    melding?: string;
    pauze: boolean;
  } | null = $state(null);

  // ---------- De ronde plannen ----------
  let auditie = $state(false);
  let niveau = $state(0);
  let opgaven: Gepland<unknown>[] = $state([]);

  function plan() {
    const kent = maakKent(vg.instellingen.letters);
    niveau = vg.vaardigheden[spel].niveau;
    auditie = !vg.auditie[spel] && !missie;
    const o = def.opgaven;
    const maak = (n: number, aantal: number) => o.maak(n, aantal, kent);
    opgaven = auditie
      ? planAuditie(auditieNiveaus(def.maxNiveau), maak, o.id)
      : planSessie({
          aantal: missie ? 4 : vg.instellingen.opgavenPerSessie,
          niveau,
          maxNiveau: def.maxNiveau,
          herhaling: aanDeBeurt(vg.herhaling, def.prefix, Date.now()),
          maak,
          herbouw: (id) => o.herbouw(id, niveau, kent),
          id: o.id,
          sleutel: o.sleutel,
          // Voor een kleuter nooit moeilijker dan zijn niveau, wel extra makkelijke opgaven.
          uitdaging: false,
          makkelijk: 0.3,
        });
  }
  plan();

  // ---------- Ringen en combo's ----------
  let tellerEl: HTMLElement | undefined = $state();
  let reeks = 0;
  let combo: number | null = $state(null);
  let comboTimer: ReturnType<typeof setTimeout> | undefined;
  const COMBO = [3, 5, 8, 12];

  function opRingen(basis: number, bron?: Element | null) {
    // Dubbele ringen uit de winkel: alles telt twee keer.
    const n = uitrusting.dubbel ? basis * 2 : basis;
    vliegRingen(n, bron, tellerEl);
    verdiend += n;
    // De teller springt pas op als de ringen aankomen.
    setTimeout(() => {
      vg.ringen += n;
      void bewaar();
    }, 800);
    // Reeks van meteen-goede antwoorden (2 ringen = bij de eerste poging goed).
    if (basis === 2) reeks++;
    else if (basis === 1) reeks = 0;
    if (COMBO.includes(reeks)) {
      clearTimeout(comboTimer);
      combo = reeks;
      speelCombo();
      zetCombo(reeks);
      verdiend += 1;
      setTimeout(() => (vg.ringen += 1), 800);
      comboTimer = setTimeout(() => (combo = null), 1800);
    }
  }

  // ---------- Powerups uit de winkel ----------
  function meld(tekst: string) {
    toast = tekst;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 2400);
  }

  /** Lucas tikt op een powerup in de balk. */
  function gebruik(id: string) {
    if (afgerond) return;
    if (id === 'dubbel' && uitrusting.dubbel) return;
    if (id === 'traag' && uitrusting.traag) return;
    if (!pakPowerup(id)) return;
    if (id === 'hart') {
      uitrusting.hart++;
      speelHart();
    } else if (id === 'dubbel') {
      uitrusting.dubbel = true;
      speelBliksem();
    } else if (id === 'traag') {
      uitrusting.traag = true;
      speelBliksem();
    } else if (id === 'vuur') {
      // Meteen een reeks van twee: nog één goed en het is een combo.
      reeks = Math.max(reeks, 2);
      speelBliksem();
    }
    const t = (teksten.winkel.artikelen as unknown as Record<string, { naam: string; aan: string }>)[id];
    meld(`${ARTIKEL[id].icoon} ${t.naam}!`);
    void spreek(t.aan);
  }

  // Een extra leven dat niet nodig was gaat terug in het zakje; de rest van de ronde is voorbij.
  onDestroy(() => {
    if (uitrusting.hart > 0) vg.winkel.voorraad.hart = (vg.winkel.voorraad.hart ?? 0) + uitrusting.hart;
    uitrusting.hart = 0;
    nieuweRonde();
    void bewaar();
  });

  // ---------- Ronde klaar ----------
  function opKlaar(resultaten: Resultaat[]) {
    // Snel dubbel tikken aan het eind mag de ronde niet twee keer tellen.
    if (afgerond) return;
    afgerond = true;
    const nu = Date.now();
    const voor = vg.vaardigheden[spel].niveau;

    let h = vg.herhaling;
    for (const r of resultaten) h = verwerkAntwoord(h, r.id, r.goed, r.niveau, nu);
    vg.herhaling = h;
    vg.stats = werkStatsBij(vg.stats, resultaten);

    let titel: string | undefined;
    let melding: string | undefined;
    if (auditie) {
      // Rekenen: alleen een niveau verder als alles op dat niveau meteen goed was.
      const nieuw = auditieUitslag(resultaten, def.maxNiveau, def.rekenen ? 1 : 2 / 3);
      vg.vaardigheden[spel] = { niveau: nieuw, recent: vg.vaardigheden[spel].recent, opNiveau: [] };
      vg.auditie[spel] = true;
      titel = 'Proefrondje klaar!';
      melding = def.maxNiveau > 0 ? `⭐ Jij begint op level ${nieuw + 1}!` : undefined;
    } else {
      // Alleen opgaven op zijn eigen niveau tellen mee voor omhoog of omlaag.
      const eigen = resultaten.filter((r) => r.niveau === voor).map((r) => r.goed);
      vg.vaardigheden[spel] = verwerkSessie(vg.vaardigheden[spel], eigen, def.maxNiveau, def.rekenen ? REKEN_REGELS : undefined);
    }

    const bonus = uitrusting.dubbel ? 10 : 5;
    vg.ringen += bonus;
    verdiend += bonus;
    const goed = resultaten.filter((r) => r.goed).length;
    // En een sticker voor het plakboek.
    sticker = geefSticker();
    vg.sessies = [
      ...vg.sessies.slice(-199),
      { datum: new Date().toISOString(), held, spel, goed, totaal: resultaten.length, ringen: verdiend, seconden: Math.round((nu - start) / 1000), auditie },
    ];
    void bewaar();
    voortgang = 1;
    const omhoog = !auditie && vg.vaardigheden[spel].niveau > voor;
    const pauze = pauzeNodig();
    setTimeout(() => {
      uitslag = { goed, totaal: resultaten.length, omhoog, titel, melding, pauze };
    }, 700);
  }

  function nogEens() {
    afgerond = false;
    uitslag = null;
    reeks = 0;
    voortgang = 0;
    verdiend = 0;
    sticker = null;
    nieuweRonde();
    start = Date.now();
    plan();
    ronde++;
  }

  const zetVoortgang = (f: number) => (voortgang = f);

  function terug() {
    stopSpreken();
    if (uitslag || voortgang === 0) opTerug();
    else opStop();
  }

  const SPELCOMP = { ringrace: Race, woordrace: Race, meer: Meer, patroon: Patroon, smash: Smash, bouwen: Bouwen, jacht: Jacht, katapult: Katapult, telbouw: TelBouw, splits: Splits,
    // 3D-spellen: zonder WebGL nemen ze hun 2D-broertje
    tunnel: webglKan() ? Tunnel : Smash, tunnelsom: webglKan() ? Tunnel : Katapult, torensmash: webglKan() ? TorenSmash : Smash, torenboem: webglKan() ? TorenBoem : TelBouw,
    patroonbaan: webglKan() ? PatroonBaan : Patroon, bouwmuur: webglKan() ? MuurBouwer : Bouwen, bomsplits: webglKan() ? BomSplits : Splits,
    meer3d: webglKan() ? Meer3D : Meer, jacht3d: webglKan() ? Jacht3D : Jacht, woordrace3d: webglKan() ? WoordRace3D : Race, kluis: Kluis } as const;
  // svelte-ignore state_referenced_locally
  const Spel = SPELCOMP[spel];
</script>

<div class="level">
  <header>
    <button class="knop-rond" onclick={terug} aria-label="Terug">
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
        <path d="M15 5 L8 12 L15 19" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div class="balk"><SchildBalk waarde={voortgang} /></div>
    {#if auditie}<div class="auditie" style="--kleur:{characters[held].kleur}">⭐</div>{/if}
    {#if missie}<div class="auditie" style="--kleur:{characters[held].kleur}">🎯 {missie.stap + 1}/{missie.totaal}</div>{/if}
    <Uitrusting opGebruik={gebruik} />
    {#if vg.winkel.gekozen.maatje}<Maatje grootte={46} />{/if}
    <div bind:this={tellerEl}><RingTeller aantal={vg.ringen} /></div>
  </header>

  {#if toast}
    {#key toast}<div class="toast">{toast}</div>{/key}
  {/if}

  {#if combo}
    {#key combo}
      <div class="combo" style="--kleur:{characters[held].kleur}">
        <span class="vuur">🔥</span>
        <span>{combo}×</span>
        <span class="bonus">+<RingPrijs prijs={1} /></span>
      </div>
    {/key}
  {/if}

  <main>
    {#key ronde}
      <Spel {spel} {opRingen} opVoortgang={zetVoortgang} {opKlaar} opgaven={opgaven as never} {auditie} {niveau} />
    {/key}
  </main>

  {#if uitslag}
    <Beloning heldin={held} {...uitslag} noten={verdiend} {sticker} {missie} {opVerder} opNogEens={nogEens} {opTerug} {opPauze} {opWinkel} {opPlakboek} />
  {/if}
</div>

<style>
  .level {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: center;
    gap: 22px;
    padding: 14px 24px 6px;
  }
  .balk {
    flex: 1;
  }
  .auditie {
    padding: 8px 20px;
    border-radius: 999px;
    font-size: 26px;
    font-weight: 700;
    background: linear-gradient(90deg, var(--kleur), #f59e0b);
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
    animation: pop-in 0.5s ease-out;
  }
  main {
    position: relative;
    flex: 1;
  }
  .combo {
    position: absolute;
    left: 50%;
    top: 92px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 30px;
    border-radius: 999px;
    font-size: 42px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(90deg, var(--kleur), #f59e0b);
    box-shadow: 0 0 40px var(--kleur), 0 8px 0 rgba(0, 0, 0, 0.25);
    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.25);
    animation: combo 1.8s ease-out forwards;
    pointer-events: none;
  }
  .toast {
    position: absolute;
    left: 50%;
    top: 84px;
    z-index: 25;
    padding: 8px 28px;
    border-radius: 999px;
    font-size: 34px;
    font-weight: 700;
    color: #3b1d00;
    background: linear-gradient(180deg, #fff7c2, #fbbf24);
    box-shadow: 0 0 34px rgba(253, 224, 71, 0.9), 0 6px 0 #92400e;
    pointer-events: none;
    animation: toast 2.4s ease-out forwards;
  }
  @keyframes toast {
    0% { transform: translateX(-50%) scale(0.3); opacity: 0; }
    12% { transform: translateX(-50%) scale(1.12); opacity: 1; }
    20% { transform: translateX(-50%) scale(1); }
    85% { transform: translateX(-50%) scale(1); opacity: 1; }
    100% { transform: translateX(-50%) translateY(-24px); opacity: 0; }
  }
  .vuur {
    animation: pop-in 0.5s ease-out;
  }
  .bonus {
    font-size: 26px;
    color: #fff7c2;
  }
  @keyframes combo {
    0% { transform: translateX(-50%) scale(0.2) rotate(-10deg); opacity: 0; }
    15% { transform: translateX(-50%) scale(1.15) rotate(3deg); opacity: 1; }
    25% { transform: translateX(-50%) scale(1) rotate(0); }
    80% { transform: translateX(-50%) scale(1); opacity: 1; }
    100% { transform: translateX(-50%) translateY(-30px) scale(0.9); opacity: 0; }
  }
</style>
