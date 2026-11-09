/**
 * Maakt mp3-bestanden van alle teksten met ElevenLabs, en controleert en verbetert ze:
 *  1. De opname wordt teruggetranscribeerd. Klopt het niet met de bedoelde tekst (verkeerde uitspraak,
 *     bijv. "kat" klinkt als "kom"), dan wordt het opnieuw geprobeerd met een ander model of een andere seed.
 *  2. Stilte aan begin en eind wordt weggeknipt.
 *  3. Elke opname wordt op dezelfde luidheid gezet (-16 LUFS) met een zachte begrenzer.
 *
 *   npm run audio:proef                 laat zien wat er ingesproken gaat worden (kost niets)
 *   npm run audio                       maakt alle ontbrekende opnames + audio-manifest.json
 *   npm run audio -- --alleen=kat       spreekt alleen teksten opnieuw in die "kat" bevatten
 *   npm run audio -- --opnieuw          spreekt alles opnieuw in
 *   npm run audio -- --proef            maakt proefstemmen in public/audio/proef/
 *
 * Sleutel: ELEVENLABS_API_KEY in .env.local (npx -y @elevenlabs/cli@latest onboard init).
 * Stem, tempo en proefstemmen staan in content/stem.json. De uitslag van elke controle staat in tools/audio-controle.json.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import stemInfo from '../content/stem.json';
import { alleTeksten } from '../src/audio/alle-teksten';
import { getalInWoorden } from '../src/audio/getallen';
import { audioSleutel, normaliseer, stemSleutel, type Spreeksoort } from '../src/audio/hash';
import { gelijkenis, isGoed } from './audio/controle';
import { DOEL_LUFS, gelijkTrekken, luidheid, maakWav, naarMp3, pcmNaarFloat, piek, SAMPLERATE, trimEnFade } from './audio/dsp';

const MAP = join(import.meta.dirname, '..', 'public', 'audio');
const TTS = join(MAP, 'tts');
const PROEF = join(MAP, 'proef');
const CONTROLE = join(import.meta.dirname, 'audio-controle.json');

for (const bestand of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(join(import.meta.dirname, '..', bestand));
  } catch {
    // bestand bestaat niet; de variabelen staan misschien al in de omgeving
  }
}

const args = process.argv.slice(2);
const vlag = (naam: string) => args.includes(`--${naam}`);
const waarde = (naam: string) => args.find((a) => a.startsWith(`--${naam}=`))?.slice(naam.length + 3);

let client: ElevenLabsClient | null = null;
function eleven() {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY ontbreekt: draai `npx -y @elevenlabs/cli@latest onboard init`.');
  return (client ??= new ElevenLabsClient());
}

// ---------------------------------------------------------------- Opnemen
type Poging = { naam: string; model: string; nl: boolean; seed: number; stabiliteit: number; tempo: boolean };

const e = stemInfo.elevenlabs;
const V4 = 'eleven_v4';

/** Per soort een rijtje pogingen: het eerste dat klopt wint. Losse woorden en getallen krijgen eerst Nederlands afgedwongen. */
function pogingen(soort: Spreeksoort): Poging[] {
  if (soort === 'woord' || soort === 'getal') {
    return [
      { naam: 'v4-nl', model: V4, nl: true, seed: 11, stabiliteit: 0.5, tempo: false },
      { naam: 'flash-nl', model: e.modelWoorden, nl: true, seed: 12, stabiliteit: 0.5, tempo: true },
      { naam: 'v4-nl-robuust', model: V4, nl: true, seed: 13, stabiliteit: 1, tempo: false },
      { naam: 'multi', model: e.modelZinnen, nl: false, seed: 14, stabiliteit: 0.5, tempo: true },
      { naam: 'v4-nl-4', model: V4, nl: true, seed: 15, stabiliteit: 0.5, tempo: false },
    ];
  }
  return [
    { naam: 'multi', model: e.modelZinnen, nl: false, seed: 21, stabiliteit: e.stabiliteit, tempo: true },
    { naam: 'v4-nl', model: V4, nl: true, seed: 22, stabiliteit: 0.5, tempo: false },
    { naam: 'multi-2', model: e.modelZinnen, nl: false, seed: 23, stabiliteit: e.stabiliteit, tempo: true },
  ];
}

/** De tekst die echt naar de stem gaat: een getal als woord ("zevenenveertig"). */
function spreekTekst(tekst: string, soort: Spreeksoort): string {
  const t = normaliseer(tekst);
  return soort === 'getal' && /^\d+$/.test(t) ? getalInWoorden(Number(t)) : t;
}

async function metHerhaling<T>(doe: () => Promise<T>): Promise<T> {
  for (let n = 1; ; n++) {
    try {
      return await doe();
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 0;
      if ((status === 429 || status >= 500) && n < 5) {
        await new Promise((r) => setTimeout(r, 1500 * 2 ** n));
        continue;
      }
      throw err;
    }
  }
}

async function neemOp(tekst: string, stem: string, soort: Spreeksoort, p: Poging): Promise<Float32Array> {
  const voiceSettings = p.model === V4
    ? { stability: p.stabiliteit, similarityBoost: e.gelijkenis }
    : { stability: p.stabiliteit, similarityBoost: e.gelijkenis, style: e.stijl, useSpeakerBoost: true, speed: p.tempo ? e.tempo[soort] : 1 };
  const stroom = await metHerhaling(() =>
    eleven().textToSpeech.convert(stem, {
      text: soort in DRAGER ? `${DRAGER[soort]} ${spreekTekst(tekst, soort)}.` : spreekTekst(tekst, soort),
      modelId: p.model,
      outputFormat: 'pcm_24000',
      seed: p.seed,
      ...(p.nl ? { languageCode: 'nl' } : {}),
      voiceSettings,
    }),
  );
  const delen: Buffer[] = [];
  for await (const d of Readable.fromWeb(stroom as import('node:stream/web').ReadableStream<Uint8Array>)) delen.push(Buffer.from(d));
  return pcmNaarFloat(Buffer.concat(delen));
}

type Woord = { text: string; start?: number; end?: number; type?: string };

async function luister(samples: Float32Array): Promise<{ tekst: string; woorden: Woord[] }> {
  const r = (await metHerhaling(() =>
    eleven().speechToText.convert({ file: new Blob([new Uint8Array(maakWav(samples))], { type: 'audio/wav' }), modelId: 'scribe_v1', languageCode: 'nld' }),
  )) as { text?: string; words?: Woord[] };
  return { tekst: (r.text ?? '').trim(), woorden: (r.words ?? []).filter((w) => (w.type ?? 'word') === 'word') };
}

/**
 * Losse woorden en getallen worden in een korte zin ingesproken ("Het woord is kat."): zo weet de stem dat het
 * Nederlands is en klinkt het natuurlijk. Daarna wordt het woord eruit geknipt met de woordtijden van de transcriptie.
 */
const DRAGER: Partial<Record<Spreeksoort, string>> = { woord: 'Het woord is', getal: 'Het getal is' };
const dragerWoorden = (soort: Spreeksoort) => (DRAGER[soort] ?? '').split(' ').filter(Boolean).length;

/** Knipt het eigenlijke woord uit de opname met de zin. Geeft null als de woordtijden niet kloppen. */
function knipWoord(samples: Float32Array, woorden: Woord[], soort: Spreeksoort): { samples: Float32Array; gehoord: string } | null {
  const n = dragerWoorden(soort);
  if (woorden.length <= n) return null;
  const staart = woorden.slice(n);
  const begin = staart[0].start;
  const eind = staart[staart.length - 1].end;
  if (begin === undefined || eind === undefined || eind <= begin) return null;
  const van = Math.max(0, Math.floor((begin - 0.06) * SAMPLERATE));
  const tot = Math.min(samples.length, Math.ceil((eind + 0.1) * SAMPLERATE));
  return { samples: samples.slice(van, tot), gehoord: staart.map((w) => w.text).join(' ') };
}

// ---------------------------------------------------------------- Controle-uitslag bewaren
type Uitslag = { tekst: string; soort: string; ok: boolean; poging: string; pogingen: number; gehoord: string; lufs: number; piek: number; seconden: number };
const controle: Record<string, Uitslag> = existsSync(CONTROLE) ? JSON.parse(readFileSync(CONTROLE, 'utf8')) : {};
const bewaarControle = () => writeFileSync(CONTROLE, JSON.stringify(controle, null, 1) + '\n');

/** Neemt een tekst op, controleert hem en probeert zo nodig opnieuw. Geeft de beste versie terug. */
async function maakOpname(tekst: string, stem: string, soort: Spreeksoort, sleutel: string, zonderControle: boolean) {
  const lijst = pogingen(soort);
  const bedoeld = spreekTekst(tekst, soort);
  let beste: { samples: Float32Array; gehoord: string; score: number; naam: string; n: number } | null = null;
  for (let i = 0; i < lijst.length; i++) {
    const ruw = await neemOp(tekst, stem, soort, lijst[i]);
    let samples = ruw;
    let gehoord = '';
    if (soort in DRAGER) {
      // Zonder controle weten we de woordtijden niet; dan wordt de hele zin bewaard, dus altijd controleren.
      const { tekst: volledig, woorden } = await luister(ruw);
      const knip = knipWoord(ruw, woorden, soort);
      const drager = woorden.slice(0, dragerWoorden(soort)).map((w) => w.text).join(' ');
      const dragerOk = gelijkenis(DRAGER[soort]!, drager) >= 0.8;
      if (!knip || !dragerOk) {
        // Zin niet goed verstaan of geen tijden: tel deze poging als mislukt.
        if (!beste) beste = { samples: trimEnFade(ruw), gehoord: volledig, score: 0, naam: lijst[i].naam, n: i + 1 };
        continue;
      }
      samples = trimEnFade(knip.samples);
      gehoord = knip.gehoord;
    } else {
      samples = trimEnFade(ruw);
      if (!zonderControle) gehoord = (await luister(samples)).tekst;
    }
    const score = zonderControle && !(soort in DRAGER) ? 1 : gelijkenis(bedoeld, gehoord);
    if (!beste || score > beste.score) beste = { samples, gehoord, score, naam: lijst[i].naam, n: i + 1 };
    if (zonderControle && !(soort in DRAGER)) break;
    if (isGoed(bedoeld, gehoord)) {
      beste = { samples, gehoord, score, naam: lijst[i].naam, n: i + 1 };
      break;
    }
  }
  const b = beste!;
  const { samples, was, wordt } = gelijkTrekken(b.samples);
  writeFileSync(join(TTS, `${sleutel}.mp3`), naarMp3(samples));
  controle[sleutel] = {
    tekst, soort, ok: (zonderControle && !(soort in DRAGER)) || isGoed(bedoeld, b.gehoord), poging: b.naam, pogingen: b.n, gehoord: b.gehoord,
    lufs: Math.round(wordt * 10) / 10, piek: Math.round(piek(samples) * 100) / 100, seconden: Math.round((samples.length / SAMPLERATE) * 100) / 100,
  };
  void was;
}

// ---------------------------------------------------------------- Opdrachten
async function maakProefstemmen() {
  mkdirSync(PROEF, { recursive: true });
  for (const p of stemInfo.proefstemmen) {
    process.stdout.write(`Proefstem ${p.naam} … `);
    try {
      const s = await neemOp(stemInfo.proefzin, p.id, 'instructie', pogingen('instructie')[0]);
      writeFileSync(join(PROEF, `${p.provider}-${p.id}.mp3`), naarMp3(gelijkTrekken(trimEnFade(s)).samples));
      console.log('klaar');
    } catch (err) {
      console.log(`mislukt: ${(err as Error).message}`);
    }
  }
}

async function parallel<T>(lijst: T[], aantal: number, doe: (t: T, i: number) => Promise<void>) {
  let volgende = 0;
  await Promise.all(
    Array.from({ length: Math.min(aantal, lijst.length) }, async () => {
      while (volgende < lijst.length) {
        const i = volgende++;
        await doe(lijst[i], i);
      }
    }),
  );
}

async function maakAlles() {
  mkdirSync(TTS, { recursive: true });
  const stem = stemInfo.stem;
  const sleutelStem = stemSleutel(stemInfo);
  const alle = alleTeksten().map((t) => ({ ...t, sleutel: audioSleutel(t.tekst, t.soort, sleutelStem) }));
  const alleen = waarde('alleen');
  const gekozen = alle.filter((t) =>
    alleen ? t.tekst.toLowerCase().includes(alleen.toLowerCase()) : vlag('opnieuw') || !existsSync(join(TTS, `${t.sleutel}.mp3`)),
  );
  const tekens = gekozen.reduce((n, t) => n + t.tekst.length, 0);
  console.log(`Stem: ${stemInfo.stemNaam ?? stem}. ${alle.length} teksten, waarvan ${gekozen.length} om te maken (${tekens} tekens, de controle kan er meer kosten).`);

  if (vlag('dry-run')) {
    gekozen.slice(0, 12).forEach((t) => console.log(`  [${t.soort}] ${t.tekst}`));
    if (gekozen.length > 12) console.log(`  … en nog ${gekozen.length - 12}`);
    return;
  }

  let klaar = 0;
  await parallel(gekozen, 3, async (t) => {
    try {
      await maakOpname(t.tekst, stem, t.soort, t.sleutel, vlag('zonder-controle'));
    } catch (err) {
      console.log(`  mislukt: ${t.tekst} (${(err as Error).message.slice(0, 80)})`);
    }
    klaar++;
    if (klaar % 20 === 0 || klaar === gekozen.length) {
      console.log(`  ${klaar}/${gekozen.length}`);
      bewaarControle();
    }
  });
  bewaarControle();

  const bestanden = alle.map((t) => t.sleutel).filter((k) => existsSync(join(TTS, `${k}.mp3`)));
  writeFileSync(join(MAP, 'audio-manifest.json'), JSON.stringify({ stem: sleutelStem, bestanden }));
  // Oude opnames (andere stem of versie) opruimen.
  const houd = new Set(bestanden);
  let weg = 0;
  for (const f of readdirSync(TTS)) {
    if (f.endsWith('.mp3') && !houd.has(f.slice(0, -4))) {
      unlinkSync(join(TTS, f));
      weg++;
    }
  }
  if (weg) console.log(`${weg} oude opnames verwijderd.`);
  console.log(`audio-manifest.json bijgewerkt (${bestanden.length} bestanden).`);

  // Uitslagen van opnames die niet meer bestaan opruimen
  for (const k of Object.keys(controle)) if (!houd.has(k)) delete controle[k];
  bewaarControle();

  const twijfel = Object.entries(controle).filter(([k, u]) => houd.has(k) && !u.ok);
  const lufs = Object.entries(controle).filter(([k]) => houd.has(k)).map(([, u]) => u.lufs);
  console.log(`Luidheid van de opnames: ${Math.min(...lufs)} tot ${Math.max(...lufs)} LUFS (doel ${DOEL_LUFS}).`);
  console.log(twijfel.length ? `Nog ${twijfel.length} opnames waarvan de uitspraak niet zeker klopt (zie tools/audio-controle.json):` : 'Alle uitspraken kloppen volgens de controle.');
  for (const [, u] of twijfel.slice(0, 25)) console.log(`  "${u.tekst}" klinkt als "${u.gehoord}" (${u.poging})`);
  void luidheid;
}

if (vlag('proef')) await maakProefstemmen();
else await maakAlles();
