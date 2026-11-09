/**
 * Opgaven voor Lucas' zes spellen (PLAN.md §3 en §4).
 * Elke generator krijgt het niveau, een aantal en de letters die Lucas kent.
 * `rnd` is te vervangen door een vaste willekeur in tests.
 */
import letterData from '../../content/letters.json';
import woordData from '../../content/woorden.json';
import { getal, schud, standaardRnd, type Rnd } from './toeval';

// ------------------------------------------------------------------ Letters en klanken
export type LetterInfo = { letter: string; woord: string; emoji: string };

export const LETTERS: LetterInfo[] = (letterData.letters as [string, string, string][]).map(([letter, woord, emoji]) => ({
  letter,
  woord,
  emoji,
}));
export const KLANKEN: string[] = letterData.klanken;
export const STANDAARD_KENT: string[] = letterData.standaardAan;
export const VERWARBAAR: string[][] = letterData.verwarbaar;

/** Alles wat Lucas kent: losse letters en lange klanken ("aa", "oe"). */
export type Kent = ReadonlySet<string>;
export const maakKent = (lijst: readonly string[]): Kent => new Set(lijst);

const MIN_LETTERS = 4;

/** De losse letters die hij kent. Te weinig bekend? Dan de eerste standaardletters, zodat een ronde altijd kan. */
export function bekendeLetters(kent: Kent): LetterInfo[] {
  const bekend = LETTERS.filter((l) => kent.has(l.letter));
  if (bekend.length >= MIN_LETTERS) return bekend;
  return LETTERS.filter((l) => STANDAARD_KENT.slice(0, 8).includes(l.letter));
}

/** Een willekeurige selectie van `n` zonder dubbele; is de lijst kort, dan opnieuw schudden. */
export function neem<T>(pool: readonly T[], n: number, sleutel: (t: T) => string, rnd: Rnd): T[] {
  if (pool.length === 0) return [];
  const uit: T[] = [];
  while (uit.length < n) {
    for (const t of schud(pool, rnd)) {
      if (uit.length >= n) break;
      // Niet twee keer precies hetzelfde direct achter elkaar.
      if (uit.length && sleutel(uit[uit.length - 1]) === sleutel(t) && pool.length > 1) continue;
      uit.push(t);
    }
    if (pool.length >= n) break;
  }
  return uit;
}

// ------------------------------------------------------------------ Ring-race (letter flitst)
export type RingOpgave = { letter: string; woord: string; emoji: string; keuzes: string[] };
export const ringId = (letter: string) => `ring.${letter}`;

export function maakRing(niveau: number, aantal: number, kent: Kent, rnd: Rnd = standaardRnd): RingOpgave[] {
  const bekend = bekendeLetters(kent);
  const namen = bekend.map((l) => l.letter);
  return neem(bekend, aantal, (l) => l.letter, rnd).map((doel) => {
    // Niveau 2: lettervriendjes die op elkaar lijken (b en d), als hij die kent.
    const lijkt = niveau > 0 ? VERWARBAAR.filter((p) => p.includes(doel.letter)).flatMap((p) => p.filter((x) => x !== doel.letter && namen.includes(x))) : [];
    const rest = schud(namen.filter((x) => x !== doel.letter && !lijkt.includes(x)), rnd);
    const af = [...schud(lijkt, rnd), ...rest].slice(0, 2);
    return { ...doel, keuzes: schud([doel.letter, ...af], rnd) };
  });
}

export function ringUitId(id: string, kent: Kent, rnd: Rnd = standaardRnd): RingOpgave | null {
  const letter = id.replace(/^ring\./, '');
  const info = LETTERS.find((l) => l.letter === letter);
  if (!info || !kent.has(letter)) return null;
  const af = schud(bekendeLetters(kent).map((l) => l.letter).filter((x) => x !== letter), rnd).slice(0, 2);
  return { ...info, keuzes: schud([letter, ...af], rnd) };
}

// ------------------------------------------------------------------ Woorden
export type WoordInfo = { woord: string; emoji: string; delen: string[] };

/** Splitst een woord in klanken: "maan" → m, aa, n. */
export function klanken(woord: string): string[] {
  const delen: string[] = [];
  for (let i = 0; i < woord.length; ) {
    const twee = woord.slice(i, i + 2);
    if (KLANKEN.includes(twee)) {
      delen.push(twee);
      i += 2;
    } else {
      delen.push(woord[i]);
      i++;
    }
  }
  return delen;
}

export const ALLE_WOORDEN: WoordInfo[] = (woordData.woorden as [string, string][]).map(([woord, emoji]) => ({
  woord,
  emoji,
  delen: klanken(woord),
}));

/** Woordjes die hij helemaal kan lezen met de letters en klanken die hij kent. */
export function speelbareWoorden(kent: Kent): WoordInfo[] {
  const lijst = ALLE_WOORDEN.filter((w) => w.delen.every((d) => kent.has(d)));
  if (lijst.length >= 6) return lijst;
  const standaard = maakKent(STANDAARD_KENT);
  return ALLE_WOORDEN.filter((w) => w.delen.every((d) => standaard.has(d)));
}

/** Niveau 1: woordjes van drie klanken; niveau 2: vier of meer. Is dat niveau leeg, dan alles. */
export function woordenVoorNiveau(niveau: number, kent: Kent): WoordInfo[] {
  const alle = speelbareWoorden(kent);
  const passend = alle.filter((w) => (niveau === 0 ? w.delen.length <= 3 : w.delen.length >= 4));
  return passend.length >= 4 ? passend : alle;
}

export const woordUitId = (id: string): WoordInfo | undefined => ALLE_WOORDEN.find((w) => w.woord === id.replace(/^[a-z]+\./, ''));

// ------------------------------------------------------------------ Woord-race (woord flitst, kies het plaatje)
export type PlaatjeKeuze = { woord: string; emoji: string };
export type WoordRaceOpgave = WoordInfo & { keuzes: PlaatjeKeuze[] };
export const woordId = (woord: string) => `woord.${woord}`;

export function maakWoordRace(niveau: number, aantal: number, kent: Kent, rnd: Rnd = standaardRnd): WoordRaceOpgave[] {
  const pool = woordenVoorNiveau(niveau, kent);
  const alle = speelbareWoorden(kent);
  return neem(pool, aantal, (w) => w.woord, rnd).map((doel) => bouwWoordRace(doel, alle, rnd));
}

function bouwWoordRace(doel: WoordInfo, alle: WoordInfo[], rnd: Rnd): WoordRaceOpgave {
  // Plaatjes van woordjes die er een beetje op lijken (zelfde beginletter of lengte), maar nooit hetzelfde plaatje.
  const anderen = alle.filter((w) => w.woord !== doel.woord && w.emoji !== doel.emoji);
  const lijkt = anderen.filter((w) => w.woord[0] === doel.woord[0] || w.delen.length === doel.delen.length);
  const af = [...schud(lijkt, rnd), ...schud(anderen, rnd)]
    .filter((w, i, l) => l.findIndex((x) => x.emoji === w.emoji) === i)
    .slice(0, 2)
    .map(({ woord, emoji }) => ({ woord, emoji }));
  return { ...doel, keuzes: schud([{ woord: doel.woord, emoji: doel.emoji }, ...af], rnd) };
}

export function woordRaceUitId(id: string, kent: Kent, rnd: Rnd = standaardRnd): WoordRaceOpgave | null {
  const w = woordUitId(id);
  return w ? bouwWoordRace(w, speelbareWoorden(kent), rnd) : null;
}

// ------------------------------------------------------------------ Letter-smash (hoor een woord, sla de beginletter kapot)
export type SmashOpgave = { woord: string; emoji: string; letter: string; keuzes: string[] };
export const smashId = (woord: string) => `smash.${woord}`;

/** Woorden met een plaatje waarvan de beginletter hij kent (de beginwoorden van de letters en de woordjes). */
export function smashWoorden(kent: Kent): { woord: string; emoji: string }[] {
  const lijst = [...LETTERS.map(({ woord, emoji }) => ({ woord, emoji })), ...ALLE_WOORDEN.map(({ woord, emoji }) => ({ woord, emoji }))];
  const gezien = new Set<string>();
  const letters = new Set(bekendeLetters(kent).map((l) => l.letter));
  return lijst.filter((w) => {
    if (!letters.has(w.woord[0]) || gezien.has(w.woord)) return false;
    gezien.add(w.woord);
    return true;
  });
}

export function maakSmash(niveau: number, aantal: number, kent: Kent, rnd: Rnd = standaardRnd): SmashOpgave[] {
  const pool = smashWoorden(kent);
  const letters = bekendeLetters(kent).map((l) => l.letter);
  return neem(pool, aantal, (w) => w.woord, rnd).map((w) => bouwSmash(w, niveau, letters, rnd));
}

function bouwSmash(w: { woord: string; emoji: string }, niveau: number, letters: string[], rnd: Rnd): SmashOpgave {
  const letter = w.woord[0];
  const lijkt = niveau > 0 ? VERWARBAAR.filter((p) => p.includes(letter)).flatMap((p) => p.filter((x) => x !== letter && letters.includes(x))) : [];
  const rest = schud(letters.filter((x) => x !== letter && !lijkt.includes(x)), rnd);
  const aantalRotsen = niveau === 0 ? 3 : 4;
  const af = [...schud(lijkt, rnd), ...rest].slice(0, aantalRotsen - 1);
  return { ...w, letter, keuzes: schud([letter, ...af], rnd) };
}

export function smashUitId(id: string, niveau: number, kent: Kent, rnd: Rnd = standaardRnd): SmashOpgave | null {
  const woord = id.replace(/^smash\./, '');
  const w = [...LETTERS.map(({ woord, emoji }) => ({ woord, emoji })), ...ALLE_WOORDEN].find((x) => x.woord === woord);
  const letters = bekendeLetters(kent).map((l) => l.letter);
  return w && letters.includes(w.woord[0]) ? bouwSmash({ woord: w.woord, emoji: w.emoji }, niveau, letters, rnd) : null;
}

// ------------------------------------------------------------------ Woord-bouwen (leg het woordje met letterstenen)
export type BouwOpgave = { woord: string; emoji: string; delen: string[]; tegels: string[] };
export const bouwId = (woord: string) => `bouw.${woord}`;

export function maakBouw(niveau: number, aantal: number, kent: Kent, rnd: Rnd = standaardRnd): BouwOpgave[] {
  const pool = woordenVoorNiveau(niveau, kent);
  return neem(pool, aantal, (w) => w.woord, rnd).map((w) => bouwTegels(w, niveau, kent, rnd));
}

function bouwTegels(w: WoordInfo, niveau: number, kent: Kent, rnd: Rnd): BouwOpgave {
  // Niveau 2: twee stenen te veel (letters die niet in het woord zitten).
  const extra = niveau > 0 ? schud(bekendeLetters(kent).map((l) => l.letter).filter((x) => !w.delen.includes(x)), rnd).slice(0, 2) : [];
  let tegels = schud([...w.delen, ...extra], rnd);
  // Niet meteen goed neergelegd: de volgorde mag niet al klaar zijn.
  for (let i = 0; i < 5 && extra.length === 0 && tegels.join('') === w.delen.join(''); i++) tegels = schud(tegels, rnd);
  return { woord: w.woord, emoji: w.emoji, delen: w.delen, tegels };
}

export function bouwUitId(id: string, niveau: number, kent: Kent, rnd: Rnd = standaardRnd): BouwOpgave | null {
  const w = woordUitId(id);
  return w ? bouwTegels(w, niveau, kent, rnd) : null;
}

// ------------------------------------------------------------------ Katapult-sommen
export type Som = { a: number; b: number; op: '+' | '-'; antwoord: number; keuzes: number[] };

const plus = (a: number, b: number) => ({ a, b, op: '+' as const });
const min = (a: number, b: number) => ({ a, b, op: '-' as const });

type KaleSom = { a: number; b: number; op: '+' | '-' };
type SomType = (r: Rnd) => KaleSom;

const plusTot5: SomType = (r) => {
  const a = getal(1, 4, r);
  return plus(a, getal(1, 5 - a, r));
};
const plusTot10: SomType = (r) => {
  const a = getal(1, 9, r);
  return plus(a, getal(1, 10 - a, r));
};
const minTot10: SomType = (r) => {
  const a = getal(2, 10, r);
  return min(a, getal(1, a - 1, r));
};
const plusTot20: SomType = (r) => {
  const x = getal(0, 8, r);
  return plus(10 + x, getal(1, 9 - x, r));
};
const minTot20: SomType = (r) => {
  const x = getal(1, 9, r);
  return min(10 + x, getal(1, x, r));
};

/** Rustige opbouw: eerst plus tot 5, dan tot 10, dan min, dan door elkaar, dan tot 20. */
export const SOM_TYPES: Record<number, SomType[]> = {
  0: [plusTot5],
  1: [plusTot10],
  2: [minTot10],
  3: [plusTot10, minTot10],
  4: [plusTot20, minTot20, plusTot10, minTot10],
};
export const REKEN_MAX = 4;

export const somId = (s: { a: number; op: '+' | '-'; b: number }) => `som.${s.a}${s.op}${s.b}`;

export function somNiveau(a: number, op: '+' | '-', b: number): number {
  const uitkomst = op === '+' ? a + b : a - b;
  if (Math.max(a, uitkomst) > 10) return 4;
  if (op === '-') return 2;
  return a + b <= 5 ? 0 : 1;
}

export function somSoort(a: number, op: '+' | '-', b: number): string {
  const uitkomst = op === '+' ? a + b : a - b;
  const bereik = Math.max(a, uitkomst) <= 5 ? 'tot 5' : Math.max(a, uitkomst) <= 10 ? 'tot 10' : 'tot 20';
  return `${op === '+' ? 'plus' : 'min'} ${bereik}`;
}

function afleiders(s: KaleSom, antwoord: number, aantal: number, rnd: Rnd): number[] {
  const hoog = Math.max(antwoord, s.a) > 10 ? 20 : 10;
  const kand = [antwoord + 1, antwoord - 1, antwoord + 2, antwoord - 2, s.a, s.b, s.op === '+' ? s.a - s.b : s.a + s.b];
  const geldig = [...new Set(kand)].filter((x) => x !== antwoord && x >= 0 && x <= hoog);
  const eerst = schud(geldig.slice(0, 2), rnd);
  const rest = schud(geldig.slice(2), rnd);
  return [...eerst, ...rest].slice(0, aantal);
}

export function somUit(a: number, op: '+' | '-', b: number, rnd: Rnd = standaardRnd): Som {
  const antwoord = op === '+' ? a + b : a - b;
  const aantal = somNiveau(a, op, b) <= 1 ? 2 : 3;
  const keuzes = schud([antwoord, ...afleiders({ a, b, op }, antwoord, aantal, rnd)], rnd);
  return { a, b, op, antwoord, keuzes };
}

export function somUitId(id: string, rnd: Rnd = standaardRnd): Som | null {
  const m = /^som\.(\d+)([+-])(\d+)$/.exec(id);
  return m ? somUit(Number(m[1]), m[2] as '+' | '-', Number(m[3]), rnd) : null;
}

export function maakSommen(niveau: number, aantal: number, rnd: Rnd = standaardRnd): Som[] {
  const typen = SOM_TYPES[Math.min(niveau, REKEN_MAX)];
  const uit: Som[] = [];
  const gezien = new Set<string>();
  for (let p = 0; uit.length < aantal && p < aantal * 60; p++) {
    const { a, b, op } = typen[Math.floor(rnd() * typen.length)](rnd);
    const k = somId({ a, op, b });
    if (gezien.has(k)) continue;
    gezien.add(k);
    uit.push(somUit(a, op, b, rnd));
  }
  return uit;
}

// ------------------------------------------------------------------ Tel & Bouw
export type TelOpgave = { soort: 'bouw' | 'tel'; n: number; keuzes?: number[] };
export const telId = (o: { soort: string; n: number }) => `tel.${o.soort}.${o.n}`;
export const TEL_MAX = 3;

function telOpgave(soort: 'bouw' | 'tel', n: number, rnd: Rnd): TelOpgave {
  if (soort === 'bouw') return { soort, n };
  const af = schud([n - 1, n + 1, n - 2, n + 2].filter((x) => x >= 1 && x <= 20), rnd).slice(0, 2);
  return { soort, n, keuzes: schud([n, ...af], rnd) };
}

export function maakTel(niveau: number, aantal: number, rnd: Rnd = standaardRnd): TelOpgave[] {
  const soort = niveau % 2 === 0 ? 'bouw' : 'tel';
  const [van, tot] = niveau < 2 ? [2, 10] : [11, 20];
  const uit: TelOpgave[] = [];
  const gezien = new Set<number>();
  for (let p = 0; uit.length < aantal && p < aantal * 60; p++) {
    const n = getal(van, tot, rnd);
    if (gezien.has(n)) continue;
    gezien.add(n);
    uit.push(telOpgave(soort, n, rnd));
  }
  return uit;
}

export function telUitId(id: string, rnd: Rnd = standaardRnd): TelOpgave | null {
  const m = /^tel\.(bouw|tel)\.(\d+)$/.exec(id);
  return m ? telOpgave(m[1] as 'bouw' | 'tel', Number(m[2]), rnd) : null;
}

// ------------------------------------------------------------------ Flitstijd (Ring-race en Woord-race)
export const FLITS_MIN = 450;
export const FLITS_MAX = 3500;
export const FLITS_START = 1800;

/** Flitstijd in milliseconden: sneller bij goed, langzamer bij fout. */
export function nieuweFlitstijd(huidig: number, goed: boolean): number {
  const nieuw = goed ? huidig * 0.92 : huidig * 1.25;
  return Math.round(Math.min(FLITS_MAX, Math.max(FLITS_MIN, nieuw)));
}

// ------------------------------------------------------------------ Meer-race (welke kant heeft meer of minder?)
export type MeerOpgave = { a: number; b: number; vraag: 'meer' | 'minder'; vorm: 'ringen' | 'cijfers' };
export const meerId = (o: MeerOpgave) => `meer.${o.vorm}.${o.vraag}.${o.a}-${o.b}`;
export const MEER_MAX = 2;

/** Welke kant is goed? */
export function meerAntwoord(o: MeerOpgave): 'links' | 'rechts' {
  const links = o.vraag === 'meer' ? o.a > o.b : o.a < o.b;
  return links ? 'links' : 'rechts';
}

export function maakMeer(niveau: number, aantal: number, rnd: Rnd = standaardRnd): MeerOpgave[] {
  const uit: MeerOpgave[] = [];
  const gezien = new Set<string>();
  for (let p = 0; uit.length < aantal && p < aantal * 80; p++) {
    const hoog = niveau === 0 ? 6 : niveau === 1 ? 10 : 20;
    const a = getal(1, hoog, rnd);
    const b = getal(1, hoog, rnd);
    if (a === b || Math.abs(a - b) < (niveau === 0 ? 2 : 1)) continue;
    const o: MeerOpgave = { a, b, vraag: niveau === 0 || rnd() < 0.5 ? 'meer' : 'minder', vorm: niveau < 2 ? 'ringen' : 'cijfers' };
    const k = meerId(o);
    if (gezien.has(k)) continue;
    gezien.add(k);
    uit.push(o);
  }
  return uit;
}

export function meerUitId(id: string): MeerOpgave | null {
  const m = /^meer\.(ringen|cijfers)\.(meer|minder)\.(\d+)-(\d+)$/.exec(id);
  return m ? { vorm: m[1] as MeerOpgave['vorm'], vraag: m[2] as MeerOpgave['vraag'], a: Number(m[3]), b: Number(m[4]) } : null;
}

// ------------------------------------------------------------------ Patroon-race (wat komt hierna?)
export const PATROON_PLAATJES = ['🔴', '🔵', '🟡', '🟢', '⭐', '💣', '🤖', '⚡'];
export const PATROON_VORMEN: Record<number, string[]> = { 0: ['AB'], 1: ['AAB', 'ABB', 'ABC'], 2: ['AABB', 'ABAC', 'ABCB', 'AABC'] };
export const PATROON_MAX = 2;
export type PatroonOpgave = { vorm: string; plaatjes: number[]; reeks: string[]; antwoord: string; keuzes: string[] };

/** Twee volle herhalingen en daarna nog één stap; het antwoord is de volgende. */
function bouwPatroon(vorm: string, plaatjes: number[], rnd: Rnd): PatroonOpgave {
  const letters = [...new Set(vorm.split(''))];
  const sym = (l: string) => PATROON_PLAATJES[plaatjes[letters.indexOf(l)]];
  const alles = Array.from({ length: vorm.length * 2 + 1 }, (_, i) => sym(vorm[i % vorm.length]));
  const antwoord = sym(vorm[(vorm.length * 2 + 1) % vorm.length]);
  const gebruikt = new Set(alles);
  const af = schud(PATROON_PLAATJES.filter((p) => p !== antwoord), rnd);
  // Eerst een plaatje dat in het patroon zit (verleidelijk), dan een willekeurig ander.
  const keuzes = schud([antwoord, ...[...af.filter((p) => gebruikt.has(p)), ...af.filter((p) => !gebruikt.has(p))].slice(0, 2)], rnd);
  return { vorm, plaatjes, reeks: alles, antwoord, keuzes };
}

export const patroonId = (o: { vorm: string; plaatjes: number[] }) => `patroon.${o.vorm}.${o.plaatjes.join('.')}`;

export function maakPatronen(niveau: number, aantal: number, rnd: Rnd = standaardRnd): PatroonOpgave[] {
  const vormen = PATROON_VORMEN[Math.min(niveau, PATROON_MAX)];
  const uit: PatroonOpgave[] = [];
  const gezien = new Set<string>();
  for (let p = 0; uit.length < aantal && p < aantal * 80; p++) {
    const vorm = vormen[Math.floor(rnd() * vormen.length)];
    const letters = new Set(vorm.split('')).size;
    const plaatjes = schud(PATROON_PLAATJES.map((_, i) => i), rnd).slice(0, letters);
    const o = bouwPatroon(vorm, plaatjes, rnd);
    const k = patroonId(o);
    if (gezien.has(k)) continue;
    gezien.add(k);
    uit.push(o);
  }
  return uit;
}

export function patroonUitId(id: string, rnd: Rnd = standaardRnd): PatroonOpgave | null {
  const m = /^patroon\.([ABC]+)\.([\d.]+)$/.exec(id);
  return m ? bouwPatroon(m[1], m[2].split('.').map(Number), rnd) : null;
}

// ------------------------------------------------------------------ Splits-bom (hoeveel moet er nog bij?)
export type SplitsOpgave = { totaal: number; a: number; b: number; keuzes: number[] };
export const splitsId = (o: { totaal: number; a: number }) => `splits.${o.totaal}.${o.a}`;
export const SPLITS_MAX = 2;

function bouwSplits(totaal: number, a: number, rnd: Rnd): SplitsOpgave {
  const b = totaal - a;
  const kand = [b + 1, b - 1, b + 2, b - 2, a, totaal].filter((x) => x !== b && x >= 0 && x <= totaal);
  const af = [...new Set(kand)];
  const keuzes = schud([b, ...[...schud(af.slice(0, 2), rnd), ...schud(af.slice(2), rnd)].slice(0, 2)], rnd);
  return { totaal, a, b, keuzes };
}

export function maakSplits(niveau: number, aantal: number, rnd: Rnd = standaardRnd): SplitsOpgave[] {
  const [van, tot] = niveau === 0 ? [2, 5] : niveau === 1 ? [4, 10] : [11, 20];
  const uit: SplitsOpgave[] = [];
  const gezien = new Set<string>();
  for (let p = 0; uit.length < aantal && p < aantal * 80; p++) {
    const totaal = getal(van, tot, rnd);
    const a = niveau === 2 && rnd() < 0.5 ? 10 : getal(1, totaal - 1, rnd);
    const k = splitsId({ totaal, a });
    if (gezien.has(k)) continue;
    gezien.add(k);
    uit.push(bouwSplits(totaal, a, rnd));
  }
  return uit;
}

export function splitsUitId(id: string, rnd: Rnd = standaardRnd): SplitsOpgave | null {
  const m = /^splits\.(\d+)\.(\d+)$/.exec(id);
  return m ? bouwSplits(Number(m[1]), Number(m[2]), rnd) : null;
}

// ------------------------------------------------------------------ Letter-jacht (sla alle stenen met dezelfde letter kapot)
export type JachtOpgave = { letter: string; woord: string; emoji: string; tegels: string[]; doelen: number[] };
export const jachtId = (letter: string) => `jacht.${letter}`;
export const JACHT_MAX = 2;

function bouwJacht(l: LetterInfo, niveau: number, letters: string[], rnd: Rnd): JachtOpgave {
  const totaal = niveau === 0 ? 6 : 9;
  const aantalDoel = niveau === 0 ? 3 : 4;
  const lijkt = niveau > 1 ? VERWARBAAR.filter((p) => p.includes(l.letter)).flatMap((p) => p.filter((x) => x !== l.letter && letters.includes(x))) : [];
  const anderen = [...schud(lijkt, rnd), ...schud(letters.filter((x) => x !== l.letter && !lijkt.includes(x)), rnd)];
  // Niet te veel verschillende storende letters: twee of drie, die vaker voorkomen.
  const pool = anderen.slice(0, niveau === 0 ? 2 : 3);
  const tegels = [...Array(aantalDoel).fill(l.letter), ...Array.from({ length: totaal - aantalDoel }, (_, i) => pool[i % pool.length])];
  const gemengd = schud(tegels, rnd);
  return { letter: l.letter, woord: l.woord, emoji: l.emoji, tegels: gemengd, doelen: gemengd.map((t, i) => (t === l.letter ? i : -1)).filter((i) => i >= 0) };
}

export function maakJacht(niveau: number, aantal: number, kent: Kent, rnd: Rnd = standaardRnd): JachtOpgave[] {
  const bekend = bekendeLetters(kent);
  const letters = bekend.map((l) => l.letter);
  return neem(bekend, aantal, (l) => l.letter, rnd).map((l) => bouwJacht(l, niveau, letters, rnd));
}

export function jachtUitId(id: string, niveau: number, kent: Kent, rnd: Rnd = standaardRnd): JachtOpgave | null {
  const info = LETTERS.find((l) => l.letter === id.replace(/^jacht\./, ''));
  return info && kent.has(info.letter) ? bouwJacht(info, niveau, bekendeLetters(kent).map((l) => l.letter), rnd) : null;
}
