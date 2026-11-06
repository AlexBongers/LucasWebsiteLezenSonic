/**
 * Maakt mp3-bestanden van alle teksten met een stemgenerator (Google, ElevenLabs of Microsoft Azure).
 *
 *   npm run audio:proef            laat zien wat er gemaakt gaat worden (kost niets)
 *   npm run audio -- --proef       maakt proefstemmen in public/audio/proef/ (laat Lana kiezen!)
 *   npm run audio -- --stemmen     zoekt Nederlandse vrouwenstemmen in de ElevenLabs-bibliotheek
 *   npm run audio                  maakt alle ontbrekende bestanden + audio-manifest.json
 *   npm run audio -- --opnieuw     spreekt alles opnieuw in (na het wijzigen van het tempo)
 *   npm run audio -- --afdwingen   spreekt de teksten uit 'nederlandsAfdwingen' (stem.json) opnieuw in
 *
 * Sleutels: GOOGLE_TTS_API_KEY, ELEVENLABS_API_KEY of AZURE_SPEECH_KEY (+ AZURE_SPEECH_REGION),
 * als omgevingsvariabele of in .env.local / .env (zie .env.example).
 * ElevenLabs koppelen: npx -y @elevenlabs/cli@latest onboard init
 * Provider, stem en tempo staan in content/stem.json.
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import stemInfo from '../content/stem.json';
import { alleTeksten } from '../src/audio/alle-teksten';
import { audioSleutel, normaliseer, stemSleutel, type Spreeksoort } from '../src/audio/hash';
import { getalInWoorden } from '../src/audio/getallen';

const MAP = join(import.meta.dirname, '..', 'public', 'audio');
const TTS = join(MAP, 'tts');
const PROEF = join(MAP, 'proef');

for (const bestand of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(join(import.meta.dirname, '..', bestand));
  } catch {
    // bestand bestaat niet; de variabelen staan misschien al in de omgeving
  }
}

type Provider = 'google' | 'elevenlabs' | 'azure';
const args = new Set(process.argv.slice(2));

async function metHerhaling(doe: () => Promise<Response>): Promise<Buffer> {
  for (let poging = 1; poging <= 5; poging++) {
    const r = await doe();
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 1000 * 2 ** poging));
      continue;
    }
    throw new Error(`fout ${r.status}: ${(await r.text()).slice(0, 400)}`);
  }
  throw new Error('de dienst blijft "te druk" zeggen; probeer het later nog eens.');
}

// ---------- Google Cloud Text-to-Speech ----------
let googleTempoWerkt = true;

async function google(tekst: string, stem: string, soort: Spreeksoort): Promise<Buffer> {
  const sleutel = process.env.GOOGLE_TTS_API_KEY;
  if (!sleutel) throw new Error('GOOGLE_TTS_API_KEY ontbreekt (zie .env.example).');
  const vraag = async (metTempo: boolean) => {
    const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${sleutel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: normaliseer(tekst) },
        voice: { languageCode: 'nl-NL', name: stem },
        audioConfig: { audioEncoding: 'MP3', ...(metTempo ? { speakingRate: stemInfo.google.tempo[soort] } : {}) },
      }),
    });
    return r;
  };
  for (let poging = 1; poging <= 5; poging++) {
    let r = await vraag(googleTempoWerkt);
    if (r.status === 400 && googleTempoWerkt) {
      // Sommige stemmen kennen geen tempo-instelling; dan zonder.
      const fout = await r.text();
      if (/speaking.?rate|pace/i.test(fout)) {
        googleTempoWerkt = false;
        r = await vraag(false);
      } else throw new Error(`fout 400: ${fout.slice(0, 400)}`);
    }
    if (r.ok) {
      const data = (await r.json()) as { audioContent: string };
      return Buffer.from(data.audioContent, 'base64');
    }
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 1000 * 2 ** poging));
      continue;
    }
    throw new Error(`fout ${r.status}: ${(await r.text()).slice(0, 400)}`);
  }
  throw new Error('Google blijft "te druk" zeggen; probeer het later nog eens.');
}

// ---------- ElevenLabs ----------
// De SDK leest ELEVENLABS_API_KEY uit de omgeving (geladen uit .env.local of .env).
let elevenClient: ElevenLabsClient | null = null;
function eleven() {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY ontbreekt: draai `npx -y @elevenlabs/cli@latest onboard init`.');
  }
  return (elevenClient ??= new ElevenLabsClient());
}

async function streamNaarBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const delen: Buffer[] = [];
  for await (const deel of Readable.fromWeb(stream as import('node:stream/web').ReadableStream<Uint8Array>)) {
    delen.push(Buffer.from(deel));
  }
  return Buffer.concat(delen);
}

async function elevenlabs(tekst: string, stem: string, soort: Spreeksoort): Promise<Buffer> {
  const e = stemInfo.elevenlabs;
  // Losse woorden: Flash-model met Nederlands afgedwongen (anders klinkt "maan" soms Engels).
  // Getallen: als woord uitgeschreven via het zinnenmodel (het Flash-model fluisterde ze soms).
  const kort = soort === 'woord';
  const forceer = ((e.nederlandsAfdwingen?.teksten ?? []) as string[]).includes(normaliseer(tekst));
  const modelId = forceer ? e.nederlandsAfdwingen.model : kort ? e.modelWoorden : e.modelZinnen;
  const v4 = /eleven_v4/.test(modelId);
  if (soort === 'getal' && /^\d+$/.test(tekst.trim())) tekst = getalInWoorden(Number(tekst));
  for (let poging = 1; poging <= 5; poging++) {
    try {
      const audio = await eleven().textToSpeech.convert(stem, {
        text: normaliseer(tekst),
        modelId,
        outputFormat: 'mp3_44100_64',
        ...(kort || forceer ? { languageCode: 'nl' } : {}),
        // Eleven v4 kent alleen stabiliteit en gelijkenis (geen stijl of tempo).
        voiceSettings: v4
          ? { stability: e.stabiliteit, similarityBoost: e.gelijkenis }
          : {
              stability: e.stabiliteit,
              similarityBoost: e.gelijkenis,
              style: e.stijl,
              useSpeakerBoost: true,
              speed: e.tempo[soort],
            },
      });
      return await streamNaarBuffer(audio);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 0;
      if ((status === 429 || status >= 500) && poging < 5) {
        await new Promise((res) => setTimeout(res, 1000 * 2 ** poging));
        continue;
      }
      throw err;
    }
  }
  throw new Error('ElevenLabs blijft "te druk" zeggen; probeer het later nog eens.');
}

async function zoekNederlandseStemmen() {
  const { voices } = await eleven().voices.getShared({
    language: 'nl',
    gender: 'female',
    pageSize: 40,
    sort: 'usage_character_count_1y',
  });
  for (const v of voices) {
    console.log(`${v.name}  [${v.accent}, ${v.age}, ${v.descriptive}, ${v.useCase}]  gebruikt door ${v.clonedByCount}`);
    console.log(`   voice_id=${v.voiceId}  owner=${v.publicOwnerId}`);
    if (v.description) console.log(`   ${v.description.replace(/\s+/g, ' ').slice(0, 160)}`);
  }
}

// ---------- Azure ----------
function escape(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function azure(tekst: string, stem: string, soort: Spreeksoort): Promise<Buffer> {
  const sleutel = process.env.AZURE_SPEECH_KEY;
  const regio = process.env.AZURE_SPEECH_REGION ?? 'westeurope';
  if (!sleutel) throw new Error('AZURE_SPEECH_KEY ontbreekt (zie .env.example).');
  const binnen = `<prosody rate="${stemInfo.azure.tempo[soort]}">${escape(normaliseer(tekst))}</prosody>`;
  const taal = stem.includes('Multilingual') ? `<lang xml:lang="nl-NL">${binnen}</lang>` : binnen;
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="nl-NL"><voice name="${stem}">${taal}</voice></speak>`;
  return metHerhaling(() =>
    fetch(`https://${regio}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': sleutel,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'gouden-missie',
      },
      body: ssml,
    }),
  );
}

function spreekIn(provider: Provider, tekst: string, stem: string, soort: Spreeksoort) {
  if (provider === 'google') return google(tekst, stem, soort);
  return provider === 'azure' ? azure(tekst, stem, soort) : elevenlabs(tekst, stem, soort);
}

const SLEUTELS: Record<Provider, string> = {
  google: 'GOOGLE_TTS_API_KEY',
  elevenlabs: 'ELEVENLABS_API_KEY',
  azure: 'AZURE_SPEECH_KEY',
};

// ---------- Opdrachten ----------
async function maakProefstemmen() {
  mkdirSync(PROEF, { recursive: true });
  for (const p of stemInfo.proefstemmen) {
    const provider = p.provider as Provider;
    if (!process.env[SLEUTELS[provider]]) continue;
    process.stdout.write(`Proefstem ${p.naam} … `);
    try {
      writeFileSync(join(PROEF, `${provider}-${p.id}.mp3`), await spreekIn(provider, stemInfo.proefzin, p.id, 'instructie'));
      console.log('klaar');
    } catch (e) {
      console.log(`mislukt: ${(e as Error).message}`);
    }
  }
  console.log('\nLuister in de Ouderhoek → Stem. Zet de gekozen stem in content/stem.json en draai: npm run audio');
}

async function maakAlles(droog: boolean) {
  mkdirSync(TTS, { recursive: true });
  const provider = stemInfo.provider as Provider;
  const stem = stemInfo.stem;
  const sleutelStem = stemSleutel(stemInfo);
  const taken = alleTeksten().map((t) => ({ ...t, sleutel: audioSleutel(t.tekst, t.soort, sleutelStem) }));
  // --opnieuw: alles opnieuw inspreken (bijv. na het wijzigen van alleen het tempo).
  // --afdwingen: de teksten uit nederlandsAfdwingen opnieuw inspreken.
  const afdwingen = new Set<string>(args.has('--afdwingen') ? ((stemInfo.elevenlabs.nederlandsAfdwingen?.teksten ?? []) as string[]) : []);
  const nieuw = args.has('--opnieuw')
    ? taken
    : taken.filter((t) => afdwingen.has(normaliseer(t.tekst)) || !existsSync(join(TTS, `${t.sleutel}.mp3`)));
  const tekens = nieuw.reduce((n, t) => n + t.tekst.length, 0);

  console.log(`Provider: ${provider}, stem: ${stem}`);
  console.log(`${taken.length} teksten, waarvan ${nieuw.length} nieuw (${tekens} tekens).`);
  if (droog) {
    nieuw.slice(0, 12).forEach((t) => console.log(`  [${t.soort}] ${t.tekst}`));
    if (nieuw.length > 12) console.log(`  … en nog ${nieuw.length - 12}`);
    return;
  }

  let klaar = 0;
  for (const t of nieuw) {
    writeFileSync(join(TTS, `${t.sleutel}.mp3`), await spreekIn(provider, t.tekst, stem, t.soort));
    klaar++;
    if (klaar % 25 === 0 || klaar === nieuw.length) console.log(`  ${klaar}/${nieuw.length}`);
  }

  const bestanden = taken.map((t) => t.sleutel).filter((k) => existsSync(join(TTS, `${k}.mp3`)));
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
}

if (args.has('--stemmen')) await zoekNederlandseStemmen();
else if (args.has('--proef')) await maakProefstemmen();
else await maakAlles(args.has('--dry-run'));
