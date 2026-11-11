<script lang="ts">
  /**
   * De Turbo-winkel. Lucas spaart gouden ringen met spelen en koopt er powerups, maatjes, ringkleuren,
   * feesteffecten, een ruimtewereld en gouden helden mee. De stem vertelt wat alles is en wat het kost.
   */
  import { onMount } from 'svelte';
  import RingTeller from '../ui/RingTeller.svelte';
  import RingPrijs from '../ui/RingPrijs.svelte';
  import { spreekbaarBedrag } from '../games/geld';
  import Maatje from '../ui/Maatje.svelte';
  import NieuweSticker from '../ui/NieuweSticker.svelte';
  import { openZakje, type StickerWinst } from '../store/plakboek.svelte';
  import { spreek, stopSpreken } from '../audio/stem';
  import { speelBijna, speelKoop, speelRing, speelTik } from '../audio/geluid';
  import { glitterOp } from '../ui/feest';
  import { ARTIKEL, ARTIKELEN, MAX_VOORRAAD, RING_FILTER, SOORTEN, artikelenVan, type Artikel, type Soort } from '../games/winkel';
  import { uitZak } from '../games/teksten';
  import { koop, heeft, isAan, voorraad, wissel } from '../store/winkel.svelte';
  import { vg } from '../store/voortgang.svelte';
  import teksten from '../../content/teksten.json';

  let { opSluit, startTab = 'power' }: { opSluit: () => void; startTab?: Soort } = $props();

  const winkel = teksten.winkel;
  type Tekst = { naam: string; uitleg: string };
  const tekst = (id: string) => (winkel.artikelen as Record<string, Tekst>)[id];

  // svelte-ignore state_referenced_locally
  let tab: Soort = $state(startTab);
  // svelte-ignore state_referenced_locally
  let gekozen: Artikel = $state(artikelenVan(startTab)[0] ?? ARTIKELEN[0]);
  let detailEl: HTMLElement | undefined = $state();
  let beurt = 0;
  let schud: string | null = $state(null);
  let zakjeWinst: StickerWinst[] | null = $state(null);

  let lijst = $derived(artikelenVan(tab));
  let genoeg = $derived(vg.ringen >= gekozen.prijs);
  let bezit = $derived(gekozen.soort !== 'power' && heeft(gekozen.id));
  let vol = $derived(gekozen.soort === 'power' && voorraad(gekozen.id) >= MAX_VOORRAAD);

  /** "Nog 15 ringen sparen, Lucas!" (afgerond op 5 boven de 20). */
  async function zegNogSparen(nog: number, mijn: number) {
    const bedrag = spreekbaarBedrag(nog);
    if (nog <= 1) return void (await spreek(winkel.nogEen));
    if (!bedrag) return void (await spreek(winkel.sparen));
    await spreek(winkel.nog);
    if (mijn !== beurt) return;
    await spreek(bedrag, 'getal');
    if (mijn !== beurt) return;
    await spreek(winkel.nogSparen);
  }

  async function zegPrijs(prijs: number, mijn: number) {
    await spreek(winkel.kost);
    if (mijn !== beurt) return;
    await spreek(String(prijs), 'getal');
    if (mijn !== beurt) return;
    await spreek(winkel.ringen);
  }

  onMount(() => {
    const mijn = ++beurt;
    void (async () => {
      await spreek(winkel.welkom);
      void mijn;
    })();
    return () => {
      beurt++;
      stopSpreken();
    };
  });

  async function kiesTab(s: Soort) {
    if (s === tab) return;
    speelTik();
    tab = s;
    gekozen = artikelenVan(s)[0];
    ++beurt;
    await spreek((winkel.tabs as Record<string, string>)[s]);
  }

  async function kiesArtikel(a: Artikel) {
    speelTik();
    gekozen = a;
    const mijn = ++beurt;
    const t = tekst(a.id);
    await spreek(t.naam);
    if (mijn !== beurt) return;
    await spreek(t.uitleg);
    if (mijn !== beurt) return;
    if (a.soort === 'power' ? voorraad(a.id) < MAX_VOORRAAD : !heeft(a.id)) await zegPrijs(a.prijs, mijn);
  }

  async function actie() {
    const a = gekozen;
    const mijn = ++beurt;
    if (a.soort !== 'power' && heeft(a.id)) {
      const aan = wissel(a.id);
      speelTik();
      await spreek(aan ? winkel.aan : winkel.uit);
      return;
    }
    const uitslag = koop(a.id);
    if (uitslag === 'te-weinig') {
      speelBijna();
      schud = a.id;
      setTimeout(() => (schud = null), 500);
      await zegNogSparen(a.prijs - vg.ringen, mijn);
      return;
    }
    if (uitslag === 'vol') {
      speelBijna();
      await spreek(winkel.vol);
      return;
    }
    if (uitslag === 'al-van-hem') {
      await spreek(winkel.bezit);
      return;
    }
    speelKoop();
    if (a.soort === 'sticker') {
      // Het zakje gaat meteen open.
      zakjeWinst = openZakje(a.id);
      return;
    }
    setTimeout(speelRing, 250);
    glitterOp(detailEl ?? null);
    await spreek(uitZak('gekocht', winkel.gekocht));
  }
</script>

{#if zakjeWinst}
  <NieuweSticker winsten={zakjeWinst} zakje opSluit={() => (zakjeWinst = null)} />
{/if}

<div class="winkel">
  <header>
    <button class="knop-rond" onclick={opSluit} aria-label="Terug">
      <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
        <path d="M15 5 L8 12 L15 19" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <h1><span class="bolt">🛒</span> Turbo-winkel</h1>
    <div class="rechts">
      {#if vg.winkel.gekozen.maatje}<Maatje grootte={46} />{/if}
      <RingTeller aantal={vg.ringen} />
    </div>
  </header>

  <nav class="tabs">
    {#each SOORTEN as s (s.soort)}
      <button class="tab" class:aan={tab === s.soort} onclick={() => kiesTab(s.soort)}>
        <span class="t-icoon">{s.icoon}</span>
        <span>{s.naam}</span>
      </button>
    {/each}
  </nav>

  <div class="rek">
    {#each lijst as a (a.id)}
      {@const t = tekst(a.id)}
      {@const aan = isAan(a.soort, a.id)}
      <button
        class="kaart"
        class:gekozen={gekozen.id === a.id}
        class:schud={schud === a.id}
        class:aan
        style="--kleur:{a.kleur}"
        onclick={() => kiesArtikel(a)}
      >
        <div class="plaatje">
          {#if a.soort === 'maatje'}
            <Maatje id={a.id} grootte={78} />
          {:else if a.soort === 'ring'}
            <svg class="ringplaat" class:regenboog={a.id === 'regenboog'} viewBox="0 0 40 40" style:filter={RING_FILTER[a.id]} aria-hidden="true">
              <circle cx="20" cy="20" r="15" fill="none" stroke="#fbbf24" stroke-width="8" />
              <circle cx="20" cy="20" r="15" fill="none" stroke="#fff7c2" stroke-width="1.5" opacity="0.8" />
            </svg>
          {:else}
            <span class="emoji">{a.icoon}</span>
          {/if}
        </div>
        <span class="naam">{t.naam}</span>
        {#if a.soort === 'power'}
          <span class="status voorraad">Heb je: {voorraad(a.id)}</span>
        {:else if heeft(a.id)}
          <span class="status van-hem">{aan ? '✔ Aan' : 'Van jou'}</span>
        {/if}
        {#if !(a.soort !== 'power' && a.soort !== 'sticker' && heeft(a.id))}
          <RingPrijs prijs={a.prijs} duur={vg.ringen < a.prijs} />
        {:else}
          <span class="weg-plek"></span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="detail" bind:this={detailEl} style="--kleur:{gekozen.kleur}">
    <div class="d-plaat">
      {#if gekozen.soort === 'maatje'}
        <Maatje id={gekozen.id} grootte={96} />
      {:else if gekozen.soort === 'ring'}
        <svg class="ringplaat groot" class:regenboog={gekozen.id === 'regenboog'} viewBox="0 0 40 40" style:filter={RING_FILTER[gekozen.id]} aria-hidden="true">
          <circle cx="20" cy="20" r="15" fill="none" stroke="#fbbf24" stroke-width="8" />
          <circle cx="20" cy="20" r="15" fill="none" stroke="#fff7c2" stroke-width="1.5" opacity="0.8" />
        </svg>
      {:else}
        <span class="emoji groot">{gekozen.icoon}</span>
      {/if}
    </div>
    <div class="d-tekst">
      <strong>{tekst(gekozen.id).naam}</strong>
      <span>{tekst(gekozen.id).uitleg}</span>
    </div>
    <button class="knop-goud d-knop" class:duur={!genoeg && !bezit} onclick={actie} disabled={vol}>
      {#if bezit}
        {isAan(gekozen.soort, gekozen.id) ? 'Uitzetten' : 'Aanzetten'}
      {:else if vol}
        Vol!
      {:else}
        Kopen <RingPrijs prijs={gekozen.prijs} />
      {/if}
    </button>
  </div>
</div>

<style>
  .winkel {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 14px 28px 20px;
    gap: 12px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 22px;
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 54px;
    text-shadow: 0 3px 0 rgba(40, 10, 90, 0.7), 0 0 28px rgba(253, 224, 71, 0.8);
  }
  .bolt {
    display: inline-block;
    animation: flits 1.8s ease-in-out infinite;
  }
  .rechts {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .tabs {
    display: flex;
    gap: 10px;
  }
  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 66px;
    border-radius: 22px;
    font-size: 24px;
    font-weight: 700;
    background: rgba(0, 20, 70, 0.5);
    border: 3px solid rgba(255, 255, 255, 0.35);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.3);
  }
  .tab.aan {
    background: linear-gradient(180deg, #fde68a, #f59e0b);
    color: #3b1d00;
    border-color: #fff7c2;
  }
  .t-icoon {
    font-size: 32px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .rek {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    justify-content: center;
    gap: 18px;
  }
  .kaart {
    position: relative;
    width: 252px;
    height: 238px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 12px 10px 10px;
    border-radius: 28px;
    background:
      radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--kleur) 40%, transparent), transparent 75%),
      rgba(10, 20, 80, 0.55);
    border: 4px solid color-mix(in srgb, var(--kleur) 70%, white);
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.3);
    animation: kaart-in 0.4s ease-out backwards;
  }
  .kaart.gekozen {
    transform: translateY(-6px) scale(1.04);
    box-shadow: 0 0 30px var(--kleur), 0 12px 0 rgba(0, 0, 0, 0.3);
    border-color: #fff;
  }
  .kaart.schud {
    animation: schud 0.45s;
  }
  .plaatje {
    height: 96px;
    display: grid;
    place-items: center;
  }
  .emoji {
    font-size: 78px;
    line-height: 1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  }
  .emoji.groot {
    font-size: 96px;
  }
  .ringplaat {
    width: 86px;
    height: 86px;
    filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.9));
  }
  .ringplaat.groot {
    width: 104px;
    height: 104px;
  }
  .regenboog {
    animation: regenboog 3s linear infinite;
  }
  .naam {
    font-size: 25px;
    font-weight: 700;
    line-height: 1.1;
    text-align: center;
  }
  .status {
    font-size: 19px;
    font-weight: 600;
    color: #bbf7d0;
  }
  .status.voorraad {
    color: #fde68a;
  }
  .weg-plek {
    height: 34px;
  }
  .detail {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 12px 24px;
    border-radius: 30px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--kleur) 38%, #06123a), rgba(6, 18, 58, 0.9));
    border: 4px solid color-mix(in srgb, var(--kleur) 70%, white);
    box-shadow: 0 0 28px color-mix(in srgb, var(--kleur) 50%, transparent);
  }
  .d-plaat {
    width: 130px;
    display: grid;
    place-items: center;
  }
  .d-tekst {
    flex: 1;
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }
  .d-tekst strong {
    font-size: 40px;
    color: #fde68a;
  }
  .d-tekst span {
    font-size: 27px;
  }
  .d-knop {
    min-width: 270px;
    min-height: 84px;
    font-size: 36px;
  }
  .d-knop.duur {
    filter: grayscale(0.7) brightness(0.85);
  }
  @keyframes kaart-in {
    from { transform: translateY(30px) scale(0.9); opacity: 0; }
  }
  @keyframes schud {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-12px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-8px); }
    80% { transform: translateX(5px); }
  }
  @keyframes flits {
    0%, 70%, 100% { transform: scale(1) rotate(0); filter: none; }
    80% { transform: scale(1.25) rotate(-8deg); filter: drop-shadow(0 0 14px #fde047); }
  }
  @keyframes regenboog {
    to { filter: hue-rotate(360deg); }
  }
</style>
