/**
 * Alle spellen, per held (PLAN.md §4). Elk spel heeft zijn eigen niveau en laat zich
 * door dezelfde ronde-planner vullen (herhaling, makkelijke opwarmer, eigen niveau).
 */
import type { Rnd } from '../engine/toeval';
import {
  jachtId, jachtUitId, maakJacht, maakMeer, maakPatronen, maakSplits, meerId, meerUitId, patroonId, patroonUitId, splitsId, splitsUitId,
  MEER_MAX, PATROON_MAX, SPLITS_MAX, JACHT_MAX,
  type JachtOpgave, type MeerOpgave, type PatroonOpgave, type SplitsOpgave,
  bouwId, bouwUitId, FLITS_START, maakBouw, maakRing, maakSmash, maakSommen, maakTel, maakWoordRace, REKEN_MAX, ringId, ringUitId,
  smashId, smashUitId, somId, somUitId, telId, telUitId, woordId, woordRaceUitId, TEL_MAX,
  type BouwOpgave, type Kent, type RingOpgave, type SmashOpgave, type Som, type TelOpgave, type WoordRaceOpgave,
} from '../engine/generator-lucas';

export type HeldId = 'sonic' | 'tails' | 'knuckles';

export type SpelId = 'ringrace' | 'woordrace' | 'meer' | 'patroon' | 'smash' | 'bouwen' | 'jacht' | 'katapult' | 'telbouw' | 'splits' | 'tunnel' | 'tunnelsom' | 'torensmash' | 'torenboem' | 'patroonbaan' | 'bouwmuur' | 'bomsplits';

/** Een spel is ook de vaardigheid waarvan het niveau wordt bijgehouden. */
export type VaardigheidId = SpelId;

/** Zo maakt en herbouwt een spel zijn opgaven (T = het soort opgave). */
export type Opgaven<T> = {
  maak: (niveau: number, aantal: number, kent: Kent, rnd?: Rnd) => T[];
  herbouw: (id: string, niveau: number, kent: Kent) => T | null;
  id: (t: T) => string;
  /** Om dubbele te voorkomen (standaard hetzelfde als id). */
  sleutel?: (t: T) => string;
};

export type SpelDef<T = unknown> = {
  id: SpelId;
  held: HeldId;
  naam: string;
  uitleg: string;
  icoon: string;
  /** Hoogste niveau (het eerste is 0). */
  maxNiveau: number;
  /** Rustigere regels voor omhoog/omlaag en strengere auditie (rekenen). */
  rekenen?: boolean;
  /** Voorvoegsel van de sleutels in de herhalingsdoosjes. */
  prefix: string;
  /** Flitsspellen onthouden hoe snel Lucas al kan lezen. */
  flits?: boolean;
  snel?: boolean;
  opgaven: Opgaven<T>;
};

const def = <T>(d: SpelDef<T>) => d as SpelDef<unknown>;

export const SPELLEN: SpelDef<unknown>[] = [
  def<RingOpgave>({
    id: 'ringrace', held: 'sonic', naam: 'Ring-race', uitleg: 'Welke letter flitste er?', icoon: '⚡', maxNiveau: 1, prefix: 'ring.', flits: true, snel: true,
    opgaven: { maak: maakRing, herbouw: (id, _n, kent) => ringUitId(id, kent), id: (o) => ringId(o.letter) },
  }),
  def<WoordRaceOpgave>({
    id: 'woordrace', held: 'sonic', naam: 'Woord-race', uitleg: 'Lees het woordje, kies het plaatje', icoon: '🏁', maxNiveau: 1, prefix: 'woord.', flits: true, snel: true,
    opgaven: { maak: maakWoordRace, herbouw: (id, _n, kent) => woordRaceUitId(id, kent), id: (o) => woordId(o.woord) },
  }),
  def<MeerOpgave>({
    id: 'meer', held: 'sonic', naam: 'Meer-race', uitleg: 'Welke kant heeft meer?', icoon: '⚖️', maxNiveau: MEER_MAX, rekenen: true, prefix: 'meer.', snel: true,
    opgaven: { maak: (n, a, _k, rnd) => maakMeer(n, a, rnd), herbouw: (id) => meerUitId(id), id: meerId },
  }),
  def<PatroonOpgave>({
    id: 'patroon', held: 'sonic', naam: 'Patroon-race', uitleg: 'Wat komt hierna?', icoon: '🔴', maxNiveau: PATROON_MAX, prefix: 'patroon.', snel: true,
    opgaven: { maak: (n, a, _k, rnd) => maakPatronen(n, a, rnd), herbouw: (id) => patroonUitId(id), id: patroonId },
  }),
  def<SmashOpgave>({
    id: 'smash', held: 'knuckles', naam: 'Letter-smash', uitleg: 'Sla de beginletter kapot', icoon: '💥', maxNiveau: 1, prefix: 'smash.', snel: true,
    opgaven: { maak: maakSmash, herbouw: (id, n, kent) => smashUitId(id, n, kent), id: (o) => smashId(o.woord) },
  }),
  def<BouwOpgave>({
    id: 'bouwen', held: 'knuckles', naam: 'Woord-bouwen', uitleg: 'Leg het woordje met stenen', icoon: '🧱', maxNiveau: 1, prefix: 'bouw.',
    opgaven: { maak: maakBouw, herbouw: (id, n, kent) => bouwUitId(id, n, kent), id: (o) => bouwId(o.woord) },
  }),
  def<JachtOpgave>({
    id: 'jacht', held: 'knuckles', naam: 'Letter-jacht', uitleg: 'Sla alle gelijke letters kapot', icoon: '🔨', maxNiveau: JACHT_MAX, prefix: 'jacht.', snel: true,
    opgaven: { maak: maakJacht, herbouw: (id, n, kent) => jachtUitId(id, n, kent), id: (o) => jachtId(o.letter) },
  }),
  def<Som>({
    id: 'katapult', held: 'tails', naam: 'Katapult-sommen', uitleg: 'Schiet de goede robot weg', icoon: '🎯', maxNiveau: REKEN_MAX, rekenen: true, prefix: 'som.', snel: true,
    opgaven: { maak: (n, a, _k, rnd) => maakSommen(n, a, rnd), herbouw: (id) => somUitId(id), id: somId },
  }),
  def<TelOpgave>({
    id: 'telbouw', held: 'tails', naam: 'Tel & Bouw', uitleg: 'Bouw een toren en laat hem ontploffen', icoon: '🏗️', maxNiveau: TEL_MAX, rekenen: true, prefix: 'tel.',
    opgaven: { maak: (n, a, _k, rnd) => maakTel(n, a, rnd), herbouw: (id) => telUitId(id), id: telId },
  }),
];

SPELLEN.push(
  def<SplitsOpgave>({
    id: 'splits', held: 'tails', naam: 'Splits-bom', uitleg: 'Maak de bom veilig', icoon: '💣', maxNiveau: SPLITS_MAX, rekenen: true, prefix: 'splits.',
    opgaven: { maak: (n, a, _k, rnd) => maakSplits(n, a, rnd), herbouw: (id) => splitsUitId(id), id: splitsId },
  }),
);

// ------------------------------------------------------------------ 3D-spellen
// Ze hebben hun eigen herhalingsdoosjes (eigen voorvoegsel) en gebruiken de opgaven van hun 2D-broertjes.
const metVoorvoegsel = (van: string, naar: string) => (id: string) => id.replace(new RegExp(`^${van}`), naar);

SPELLEN.push(
  def<SmashOpgave>({
    id: 'tunnel', held: 'sonic', naam: 'Turbo-tunnel 3D', uitleg: 'Ren door de poort met de beginletter', icoon: '🌀', maxNiveau: 1, prefix: 'tunnel.', snel: true,
    opgaven: {
      maak: maakSmash,
      herbouw: (id, n, kent) => smashUitId(metVoorvoegsel('tunnel\\.', 'smash.')(id), n, kent),
      id: (o) => `tunnel.${o.woord}`,
    },
  }),
  def<Som>({
    id: 'tunnelsom', held: 'tails', naam: 'Reken-tunnel 3D', uitleg: 'Ren door de poort met het antwoord', icoon: '🚀', maxNiveau: REKEN_MAX, rekenen: true, prefix: 'tsom.', snel: true,
    opgaven: {
      maak: (n, a, _k, rnd) => maakSommen(n, a, rnd),
      herbouw: (id) => somUitId(metVoorvoegsel('tsom\\.', '')(id)),
      id: (s) => `tsom.${somId(s)}`,
    },
  }),
  def<SmashOpgave>({
    id: 'torensmash', held: 'knuckles', naam: 'Toren-smash 3D', uitleg: 'Sla het goede blok uit de toren', icoon: '🗼', maxNiveau: 1, prefix: 'toren.', snel: true,
    opgaven: {
      maak: maakSmash,
      herbouw: (id, n, kent) => smashUitId(metVoorvoegsel('toren\\.', 'smash.')(id), n, kent),
      id: (o) => `toren.${o.woord}`,
    },
  }),
  def<TelOpgave>({
    id: 'torenboem', held: 'tails', naam: 'Toren-boem 3D', uitleg: 'Tel de blokken en laat de toren ontploffen', icoon: '🧨', maxNiveau: 1, rekenen: true, prefix: 'boem.',
    opgaven: {
      maak: (n, a, _k, rnd) => maakTel(n === 0 ? 1 : 3, a, rnd),
      herbouw: (id) => telUitId(`tel.tel.${id.replace(/^boem\./, '')}`),
      id: (o) => `boem.${o.n}`,
    },
  }),
);

SPELLEN.push(
  def<PatroonOpgave>({
    id: 'patroonbaan', held: 'sonic', naam: 'Patroon-baan 3D', uitleg: 'Wat komt er op het laatste platform?', icoon: '🌈', maxNiveau: PATROON_MAX, prefix: 'pbaan.', snel: true,
    opgaven: {
      maak: (n, a, _k, rnd) => maakPatronen(n, a, rnd),
      herbouw: (id) => patroonUitId(id.replace(/^pbaan\./, '')),
      id: (o) => `pbaan.${patroonId(o)}`,
    },
  }),
  def<BouwOpgave>({
    id: 'bouwmuur', held: 'knuckles', naam: 'Muur-bouwer 3D', uitleg: 'Bouw het woord met grote letterblokken', icoon: '🏰', maxNiveau: 1, prefix: 'muur.',
    opgaven: {
      maak: maakBouw,
      herbouw: (id, n, kent) => bouwUitId(id.replace(/^muur\./, ''), n, kent),
      id: (o) => `muur.${bouwId(o.woord)}`,
    },
  }),
  def<SplitsOpgave>({
    id: 'bomsplits', held: 'tails', naam: 'Splits-bom 3D', uitleg: 'Maak de grote bom veilig met ringen', icoon: '🛠️', maxNiveau: SPLITS_MAX, rekenen: true, prefix: 'bsplits.',
    opgaven: {
      maak: (n, a, _k, rnd) => maakSplits(n, a, rnd),
      herbouw: (id) => splitsUitId(id.replace(/^bsplits\./, '')),
      id: (o) => `bsplits.${splitsId(o)}`,
    },
  }),
);

export const SPEL = Object.fromEntries(SPELLEN.map((s) => [s.id, s])) as Record<SpelId, SpelDef<unknown>>;
export const spellenVan = (h: HeldId) => SPELLEN.filter((s) => s.held === h);

/** Opgaven voor de auditie: 8 stuks die oplopen in moeilijkheid (het niveau per opgave). */
export function auditieNiveaus(maxNiveau: number): number[] {
  if (maxNiveau <= 1) return [0, 0, 0, 0, 1, 1, 1, 1];
  if (maxNiveau === 2) return [0, 0, 0, 1, 1, 2, 2, 2];
  if (maxNiveau === 3) return [0, 0, 1, 1, 2, 2, 3, 3];
  return [0, 0, 1, 2, 2, 3, 4, 4];
}

export { FLITS_START };
