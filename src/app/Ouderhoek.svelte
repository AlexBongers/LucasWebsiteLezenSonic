<script lang="ts">
  import { onMount } from 'svelte';
  import { bewaar, exporteer, importeer, vg, wisAlles } from '../store/voortgang.svelte';
  import { percentage, zetNiveau } from '../engine/adaptief';
  import { inDoosjes } from '../engine/herhaling';
  import { lastigsteSommen, vaakVerwisseld } from '../engine/overzicht';
  import { FLITS_START, KLANKEN, LETTERS, STANDAARD_KENT, speelbareWoorden, maakKent } from '../engine/generator-lucas';
  import { aantalStemBestanden, nederlandseStemmen, spreek, zetApparaatStem } from '../audio/stem';
  import { zetEffectenAan } from '../audio/geluid';
  import stemInfo from '../../content/stem.json';
  import { SPELLEN, type SpelId } from '../games/spellen';
  import characters from '../../content/characters.json';
  import { ARTIKEL } from '../games/winkel';
  import { verdien } from '../store/winkel.svelte';

  let { opSluit }: { opSluit: () => void } = $props();

  /** Uitleg per niveau, per spel. */
  const NIVEAUS: Record<SpelId, string[]> = {
    ringrace: ['1 · letters kiezen uit drie', '2 · ook letters die op elkaar lijken (b en d)'],
    woordrace: ['1 · woordjes van drie klanken', '2 · woordjes van vier of meer klanken'],
    smash: ['1 · beginletter kiezen uit drie stenen', '2 · vier stenen, ook letters die op elkaar lijken'],
    bouwen: ['1 · woordjes van drie klanken leggen', '2 · vier of meer klanken, met stenen te veel'],
    katapult: ['1 · plus tot 5', '2 · plus tot 10', '3 · min tot 10', '4 · plus en min door elkaar tot 10', '5 · tot 20 zonder over het tiental'],
    telbouw: ['1 · bouwen tot 10', '2 · tellen tot 10', '3 · bouwen tot 20', '4 · tellen tot 20'],
    meer: ['1 · ringen vergelijken tot 6', '2 · ringen tot 10, ook minder', '3 · getallen tot 20, groter en kleiner'],
    patroon: ['1 · rood, blauw, rood, blauw (AB)', '2 · AAB, ABB en ABC', '3 · patronen van vier'],
    splits: ['1 · bom tot 5', '2 · bom tot 10', '3 · bom tot 20'],
    tunnel: ['1 · letters die hij kent', '2 · ook de lastige letters'],
    tunnelsom: ['1 · plus tot 5', '2 · plus tot 10', '3 · min tot 10', '4 · plus en min door elkaar', '5 · tot 20'],
    torensmash: ['1 · letters die hij kent', '2 · ook de lastige letters'],
    torenboem: ['1 · torens tot 10 blokken', '2 · torens tot 20 blokken'],
    patroonbaan: ['1 · rood, blauw, rood, blauw (AB)', '2 · AAB, ABB en ABC', '3 · patronen van vier'],
    bouwmuur: ['1 · woordjes van drie klanken leggen', '2 · vier of meer klanken, met blokken te veel'],
    bomsplits: ['1 · bom tot 5', '2 · bom tot 10', '3 · bom tot 20'],
    meer3d: ['1 · ringen vergelijken tot 6', '2 · ringen tot 10, ook minder', '3 · getallen tot 20, groter en kleiner'],
    woordrace3d: ['1 · woordjes van drie klanken', '2 · woordjes van vier of meer klanken'],
    jacht3d: ['1 · zes blokken, drie gezocht', '2 · negen blokken, vier gezocht', '3 · negen blokken met lettervriendjes (b en d)'],
    jacht: ['1 · zes stenen, drie gezocht', '2 · negen stenen, vier gezocht', '3 · negen stenen met lettervriendjes (b en d)'],
  };

  let stemmen: SpeechSynthesisVoice[] = $state([]);
  let melding = $state('');
  let proefstemmen: { id: string; naam: string; url: string }[] = $state([]);

  onMount(() => {
    const laad = () => (stemmen = nederlandseStemmen());
    laad();
    speechSynthesis?.addEventListener?.('voiceschanged', laad);
    // Proefstemmen van de stemgenerator (alleen als ze gemaakt zijn met: npm run audio -- --proef)
    Promise.all(
      stemInfo.proefstemmen.map(async (p) => {
        const url = `${import.meta.env.BASE_URL}audio/proef/${p.provider}-${p.id}.mp3`;
        try {
          const r = await fetch(url, { method: 'HEAD' });
          return r.ok && (r.headers.get('content-type') ?? '').includes('audio') ? { ...p, url } : null;
        } catch {
          return null;
        }
      }),
    ).then((l) => (proefstemmen = l.filter((x) => x !== null)));
    return () => speechSynthesis?.removeEventListener?.('voiceschanged', laad);
  });

  const week = $derived(vg.sessies.filter((s) => Date.now() - new Date(s.datum).getTime() < 7 * 864e5));
  const minutenWeek = $derived(Math.round(week.reduce((t, s) => t + s.seconden, 0) / 60));
  const gespeeld = (id: string) => vg.sessies.filter((x) => x.spel === id).length;

  function pct(v: { recent: boolean[]; niveau: number }) {
    const p = percentage(v);
    return p === null ? 'nog geen gegevens' : `${p}% goed (laatste ${v.recent.length})`;
  }

  const lastig = $derived(lastigsteSommen(vg.stats).slice(0, 5));
  const verwisseld = $derived(vaakVerwisseld(vg.stats));
  const doosjes = $derived(inDoosjes(vg.herhaling, '').slice(0, 24));
  const kent = $derived(new Set(vg.instellingen.letters));
  const aantalWoorden = $derived(speelbareWoorden(maakKent(vg.instellingen.letters)).length);

  const toonId = (id: string) =>
    id.startsWith('som.') ? id.slice(4).replace('+', ' + ').replace('-', ' − ') : id.replace(/^[a-z]+\./, '');

  async function kiesNiveau(spel: SpelId, e: Event) {
    vg.vaardigheden[spel] = zetNiveau(vg.vaardigheden[spel], Number((e.target as HTMLSelectElement).value));
    vg.auditie[spel] = true;
    await bewaar();
  }

  async function auditieOpnieuw(spel: SpelId) {
    vg.auditie[spel] = false;
    await bewaar();
    melding = `Het proefrondje van ${SPELLEN.find((s) => s.id === spel)?.naam} komt de volgende keer.`;
  }

  async function zetLetter(l: string, aan: boolean) {
    const nu = new Set(vg.instellingen.letters);
    if (aan) nu.add(l);
    else nu.delete(l);
    // Volgorde van het alfabet-lijstje aanhouden.
    const volgorde = [...LETTERS.map((x) => x.letter), ...KLANKEN];
    vg.instellingen.letters = volgorde.filter((x) => nu.has(x));
    await bewaar();
  }

  async function standaardLetters() {
    vg.instellingen.letters = [...STANDAARD_KENT];
    await bewaar();
  }

  async function kiesStem(uri: string | null) {
    vg.instellingen.apparaatStem = uri;
    zetApparaatStem(uri);
    await bewaar();
    await spreek(stemInfo.proefzin);
  }

  function download() {
    const blob = new Blob([exporteer()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `turbo-missie-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function upload(e: Event) {
    const bestand = (e.target as HTMLInputElement).files?.[0];
    if (!bestand) return;
    try {
      await importeer(await bestand.text());
      melding = 'Back-up teruggezet.';
    } catch (err) {
      melding = (err as Error).message;
    }
  }

  async function wis() {
    if (confirm('Weet je zeker dat je alle voortgang en gouden ringen wilt wissen?')) {
      await wisAlles();
      melding = 'Alles is gewist.';
    }
  }
</script>

<div class="ouder">
  <header>
    <h1>Ouderhoek</h1>
    <button class="sluit" onclick={opSluit}>Sluiten ✕</button>
  </header>

  <div class="raster">
    <section>
      <h2>Overzicht</h2>
      <p><strong>{vg.ringen}</strong> gouden ringen · <strong>{week.length}</strong> rondes en <strong>{minutenWeek}</strong> minuten in de afgelopen 7 dagen</p>
      <table>
        <tbody>
          {#each SPELLEN as sp}
            <tr>
              <th>{sp.naam} <small>({characters[sp.held].naam})</small></th>
              <td>niveau {vg.vaardigheden[sp.id].niveau + 1} van {sp.maxNiveau + 1} · {gespeeld(sp.id)}× gespeeld{#if sp.flits}<br /><small>flitstijd nu {(vg.flitstijd / 1000).toFixed(2)} s</small>{/if}</td>
              <td>{pct(vg.vaardigheden[sp.id])}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h3>Wat is lastig?</h3>
      {#if lastig.length === 0 && verwisseld.length === 0}
        <p class="uitleg">Na een paar rondes zie je hier welke sommen lastig zijn en welke letters hij verwisselt.</p>
      {/if}
      {#if lastig.length}
        <table class="smal">
          <tbody>
            {#each lastig as l}
              <tr class:rood={l.pct < 60} class:groen={l.pct >= 85}>
                <th>{l.soort}</th><td>{l.pct}% meteen goed <small>({l.totaal}×)</small></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      {#if verwisseld.length}
        <p>Verwisselt vaak:
          {#each verwisseld as v, i}{i > 0 ? ', ' : ' '}<strong>{v.letter}</strong> → {v.gekozen} <small>({v.keer}×)</small>{/each}
        </p>
      {/if}

      <h3>Herhalingsdoosjes</h3>
      {#if doosjes.length === 0}
        <p class="uitleg">Leeg. Wat niet meteen goed gaat, komt hier en wordt vaker herhaald tot het gekend is.</p>
      {:else}
        <p class="uitleg">Komt vaker terug tot het 5 keer goed ging (doos 1 = net fout, doos 5 = bijna gekend).</p>
        <div class="doosjes">
          {#each doosjes as d}<span class="doos" title="doos {d.item.doos}">{toonId(d.id)} <small>{d.item.doos}</small></span>{/each}
        </div>
      {/if}

      {#if vg.sessies.length}
        <h3>Laatste rondes</h3>
        <ul class="sessies">
          {#each vg.sessies.slice(-6).reverse() as s}
            <li>
              {new Date(s.datum).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
              · {SPELLEN.find((x) => x.id === s.spel)?.naam ?? s.spel}{s.auditie ? ' (proefrondje)' : ''} · {s.goed}/{s.totaal} meteen goed · {Math.round(s.seconden / 60)} min
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h2>Turbo-winkel</h2>
      <p class="uitleg">
        Lucas verdient bliksems met rondes (1 tot 3) en dagmissies (5) en koopt er powerups, maatjes en meer mee. Er wordt nooit echt geld uitgegeven.
        Nu in kas: <strong>{vg.bliksems}</strong> · totaal verdiend: {vg.bliksemsTotaal} · uitgegeven: {vg.winkel.uitgegeven}.
        Plakboek: {Object.keys(vg.plakboek.stickers).length} van 64 stickers, {vg.plakboek.glim.length} glimmend.
        {#if vg.winkel.bezit.length}Hij heeft: {vg.winkel.bezit.map((id) => ARTIKEL[id]?.icoon ?? id).join(' ')}{/if}
      </p>
      <div class="rij">
        <button class="klein" onclick={() => verdien(5)}>⚡ Geef 5 bliksems (beloning)</button>
        <button class="klein" onclick={() => verdien(20)}>⚡ Geef 20 bliksems</button>
        <button class="klein" onclick={() => { vg.plakboek = { stickers: {}, glim: [], vol: [] }; bewaar(); }}>Plakboek leegmaken</button>
        <button class="klein" onclick={() => { vg.winkel.voorraad = {}; vg.winkel.bezit = []; vg.winkel.gekozen = { maatje: '', ring: '', feest: '', wereld: '', held: '' }; bewaar(); }}>Winkel leegmaken</button>
      </div>
    </section>

    <section>
      <h2>Welke letters kent Lucas?</h2>
      <p class="uitleg">
        De letterspellen gebruiken alleen deze letters, en de woordjes alleen als hij alle letters ervan kent. Zet hier de letters van de week uit de methode aan.
        Nu {kent.size} aan, dat zijn {aantalWoorden} woordjes.
      </p>
      <div class="letters">
        {#each LETTERS as l}
          <label class="letter" class:aan={kent.has(l.letter)}>
            <input type="checkbox" checked={kent.has(l.letter)} onchange={(e) => zetLetter(l.letter, e.currentTarget.checked)} />
            {l.letter}
          </label>
        {/each}
      </div>
      <p class="uitleg">Lange klanken (twee letters samen):</p>
      <div class="letters">
        {#each KLANKEN as k}
          <label class="letter klank" class:aan={kent.has(k)}>
            <input type="checkbox" checked={kent.has(k)} onchange={(e) => zetLetter(k, e.currentTarget.checked)} />
            {k}
          </label>
        {/each}
      </div>
      <button class="klein" onclick={standaardLetters}>Terug naar de standaardletters</button>

      <h2>Niveau</h2>
      <p class="uitleg">
        Elk spel begint met een proefrondje van 8 opgaven die steeds moeilijker worden. Daarna past het niveau zich aan. Hier kun je het zelf zetten.
        Voor rekenen gaat het pas een stapje omhoog bij 9 van de 10 goed.
      </p>
      {#each SPELLEN as sp}
        <label>
          {sp.naam}
          <select value={vg.vaardigheden[sp.id].niveau} onchange={(e) => kiesNiveau(sp.id, e)}>
            {#each NIVEAUS[sp.id] as n, i}<option value={i}>{n}</option>{/each}
          </select>
        </label>
      {/each}
      <div class="rij">
        {#each SPELLEN as sp}
          <button class="klein" onclick={() => auditieOpnieuw(sp.id)}>Proefrondje {sp.naam} opnieuw</button>
        {/each}
      </div>
      <button class="klein" onclick={() => { vg.flitstijd = FLITS_START; bewaar(); }}>Flitstijd terug naar 1,8 s</button>
    </section>

    <section>
      <h2>Instellingen</h2>
      <label>
        Opdrachten per ronde
        <select bind:value={vg.instellingen.opgavenPerSessie} onchange={bewaar}>
          {#each [4, 6, 8, 10] as n}<option value={n}>{n}</option>{/each}
        </select>
      </label>
      <label>
        Pauze na
        <select bind:value={vg.instellingen.sessieMinuten} onchange={bewaar}>
          <option value={5}>5 minuten</option>
          <option value={10}>10 minuten</option>
          <option value={15}>15 minuten</option>
          <option value={0}>geen pauze</option>
        </select>
      </label>
      <label class="vink">
        <input type="checkbox" bind:checked={vg.instellingen.volledigScherm} onchange={bewaar} />
        Volledig scherm bij het starten (verbergt de knoppen van de tablet)
      </label>
      <label class="vink">
        <input type="checkbox" bind:checked={vg.instellingen.effecten} onchange={() => { zetEffectenAan(vg.instellingen.effecten); bewaar(); }} />
        Geluidseffecten
      </label>

      <h2>Stem</h2>
      {#if aantalStemBestanden() > 0}
        <p>✅ {aantalStemBestanden()} teksten zijn ingesproken door ElevenLabs (stem {stemInfo.stemNaam ?? stemInfo.stem}).</p>
      {:else}
        <p class="uitleg">De stemgenerator (ElevenLabs) is nog niet gebruikt. Tot die tijd spreekt de tablet zelf. Kies hieronder de mooiste Nederlandse stem van deze tablet.</p>
      {/if}
      {#if proefstemmen.length}
        <h3>Proefstemmen (laat Lucas kiezen!)</h3>
        {#each proefstemmen as p}
          <button class="klein" onclick={() => new Audio(p.url).play()}>▶ {p.naam}</button>
        {/each}
      {/if}
      <h3>Stem van deze tablet</h3>
      {#if stemmen.length === 0}
        <p class="uitleg">Geen Nederlandse stem gevonden. Op Android: Instellingen → Algemeen beheer → Tekst-naar-spraak → kies "Spraakservices van Google" en installeer Nederlands.</p>
      {/if}
      {#each stemmen as v}
        <button class="stem" class:actief={vg.instellingen.apparaatStem === v.voiceURI} onclick={() => kiesStem(v.voiceURI)}>
          ▶ {v.name} <small>({v.lang})</small>
        </button>
      {/each}

      <h2>Back-up</h2>
      <div class="rij">
        <button class="klein" onclick={download}>Voortgang downloaden</button>
        <label class="klein bestand">Back-up terugzetten<input type="file" accept="application/json" onchange={upload} /></label>
        <button class="klein gevaar" onclick={wis}>Alles wissen</button>
      </div>
      {#if melding}<p class="melding">{melding}</p>{/if}
    </section>
  </div>
</div>

<style>
  .ouder {
    position: fixed;
    inset: 0;
    z-index: 30;
    overflow-y: auto;
    padding: 20px 28px 40px;
    background: #f8fafc;
    color: #0f172a;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    user-select: text;
    color-scheme: light;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h1 {
    margin: 0;
    font-size: 30px;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 21px;
  }
  h3 {
    margin: 14px 0 6px;
    font-size: 16px;
  }
  .raster {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr;
    gap: 18px;
    margin-top: 16px;
  }
  section {
    padding: 18px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
    font-size: 16px;
  }
  section h2:not(:first-child) {
    margin-top: 22px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    text-align: left;
    vertical-align: top;
    padding: 8px 6px;
    border-top: 1px solid #e2e8f0;
  }
  th {
    width: 26%;
  }
  table.smal th {
    width: 60%;
    font-weight: 500;
  }
  tr.rood td {
    color: #b91c1c;
    font-weight: 600;
  }
  tr.groen td {
    color: #15803d;
  }
  .doosjes {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .doos {
    padding: 3px 10px;
    border-radius: 8px;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    font-size: 15px;
  }
  .doos small {
    color: #92400e;
    font-size: 11px;
    vertical-align: super;
  }
  .uitleg {
    color: #475569;
    font-size: 15px;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 10px 0;
    font-weight: 600;
  }
  label.vink {
    flex-direction: row;
    align-items: center;
    font-weight: 400;
  }
  select {
    min-height: 44px;
    font-size: 15px;
    border-radius: 10px;
    border: 1px solid #cbd5e1;
    padding: 0 8px;
    background: #fff;
    color: #0f172a;
  }
  input[type='checkbox'] {
    width: 24px;
    height: 24px;
  }
  .sluit, .klein, .stem {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 10px;
    background: #e2e8f0;
    color: #0f172a;
    font-size: 15px;
    margin: 4px 6px 4px 0;
  }
  .sluit {
    background: #1e1b4b;
    color: #fff;
    font-size: 18px;
  }
  .stem {
    display: block;
    width: 100%;
    text-align: left;
  }
  .stem.actief {
    background: #dbeafe;
    outline: 2px solid #2563eb;
  }
  .rij {
    display: flex;
    flex-wrap: wrap;
  }
  .bestand {
    display: inline-flex;
    justify-content: center;
    font-weight: 400;
    margin: 4px 6px 4px 0;
  }
  .bestand input {
    display: none;
  }
  .gevaar {
    background: #fee2e2;
    color: #991b1b;
  }
  .sessies {
    padding-left: 18px;
    margin: 0;
    color: #334155;
  }
  .letters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .letter {
    position: relative;
    display: grid;
    place-items: center;
    min-width: 40px;
    height: 40px;
    margin: 0;
    padding: 0 8px;
    border-radius: 8px;
    font-size: 20px;
    font-weight: 700;
    background: #e2e8f0;
    color: #64748b;
    cursor: pointer;
    flex-direction: row;
  }
  .letter.aan {
    background: #2563eb;
    color: #fff;
  }
  .letter input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  .melding {
    font-weight: 600;
    color: #15803d;
  }
</style>
