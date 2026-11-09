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
  import { stopSpreken } from '../audio/stem';
  import { speelCombo } from '../audio/geluid';
  import { vliegRingen } from '../ui/vlieg';

  let {
    spel,
    opTerug,
    opStop,
    pauzeNodig = () => false,
    opPauze = opTerug,
    missie = null,
    opVerder = () => {},
  }: {
    spel: SpelId;
    /** Bij een dagmissie: korte rondes zonder proefrondje, en daarna door naar het volgende spel. */
    missie?: { stap: number; totaal: number } | null;
    opVerder?: () => void;
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

  function opRingen(n: number, bron?: Element | null) {
    vliegRingen(n, bron, tellerEl);
    verdiend += n;
    // De teller springt pas op als de ringen aankomen.
    setTimeout(() => {
      vg.ringen += n;
      void bewaar();
    }, 800);
    // Reeks van meteen-goede antwoorden (2 ringen = bij de eerste poging goed).
    if (n === 2) reeks++;
    else if (n === 1) reeks = 0;
    if (COMBO.includes(reeks)) {
      clearTimeout(comboTimer);
      combo = reeks;
      speelCombo();
      verdiend += 1;
      setTimeout(() => (vg.ringen += 1), 800);
      comboTimer = setTimeout(() => (combo = null), 1800);
    }
  }

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

    const bonus = 5;
    vg.ringen += bonus;
    verdiend += bonus;
    const goed = resultaten.filter((r) => r.goed).length;
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

  const SPELCOMP = { ringrace: Race, woordrace: Race, meer: Meer, patroon: Patroon, smash: Smash, bouwen: Bouwen, jacht: Jacht, katapult: Katapult, telbouw: TelBouw, splits: Splits } as const;
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
    {#if auditie}<div class="auditie" style="--kleur:{characters[held].kleur}">⭐ Proefrondje</div>{/if}
    {#if missie}<div class="auditie" style="--kleur:{characters[held].kleur}">🎯 Missie {missie.stap + 1}/{missie.totaal}</div>{/if}
    <div bind:this={tellerEl}><RingTeller aantal={vg.ringen} /></div>
  </header>

  {#if combo}
    {#key combo}
      <div class="combo" style="--kleur:{characters[held].kleur}">
        <span class="vuur">🔥</span>
        <span>{combo} op rij!</span>
        <span class="bonus">+1 ring</span>
      </div>
    {/key}
  {/if}

  <main>
    {#key ronde}
      <Spel {spel} {opRingen} opVoortgang={zetVoortgang} {opKlaar} opgaven={opgaven as never} {auditie} {niveau} />
    {/key}
  </main>

  {#if uitslag}
    <Beloning heldin={held} {...uitslag} noten={verdiend} {missie} {opVerder} opNogEens={nogEens} {opTerug} {opPauze} />
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
