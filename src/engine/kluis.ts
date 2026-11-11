/**
 * Kluis-kraker (groep 3): in een woord mist één klank. De stem zegt het woord; Lucas kiest de klank die ontbreekt.
 *  niveau 0: de middelste klinker van een woord van drie klanken (k_t: a, o of i?)
 *  niveau 1: elke plek, ook lange klanken (aa, oo, ie) en letters die op elkaar lijken (b/d)
 */
import { ALLE_WOORDEN, LETTERS, VERWARBAAR, speelbareWoorden, type Kent, type WoordInfo } from './generator-lucas';
import { schud, standaardRnd, type Rnd } from './toeval';

export const KORTE_KLINKERS = ['a', 'e', 'i', 'o', 'u'];
export const LANGE_KLINKERS = ['aa', 'ee', 'oo', 'uu', 'ie', 'oe', 'eu', 'ui', 'ij', 'ei', 'ou', 'au'];
const isKlinker = (k: string) => KORTE_KLINKERS.includes(k) || LANGE_KLINKERS.includes(k);

export type KluisOpgave = WoordInfo & { gat: number; antwoord: string; keuzes: string[] };
export const kluisId = (o: { woord: string; gat: number }) => `kluis.${o.woord}.${o.gat}`;
export const KLUIS_MAX = 1;

function afleiders(antwoord: string, niveau: number, rnd: Rnd): string[] {
  if (isKlinker(antwoord)) {
    const pool = niveau === 0 ? KORTE_KLINKERS : [...KORTE_KLINKERS, ...LANGE_KLINKERS];
    // Bij een lange klank eerst de korte broer (aa ↔ a): dat is het lastige.
    const broer = antwoord.length === 2 && antwoord[0] === antwoord[1] ? [antwoord[0]] : [];
    return [...broer, ...schud(pool.filter((k) => k !== antwoord && !broer.includes(k)), rnd)].slice(0, 2);
  }
  const lijkt = VERWARBAAR.filter((p) => p.includes(antwoord)).flatMap((p) => p.filter((x) => x !== antwoord));
  const medeklinkers = LETTERS.map((l) => l.letter).filter((l) => !isKlinker(l) && l !== antwoord && !lijkt.includes(l));
  return [...schud(lijkt, rnd), ...schud(medeklinkers, rnd)].slice(0, 2);
}

function bouwKluis(w: WoordInfo, gat: number, niveau: number, rnd: Rnd): KluisOpgave {
  const antwoord = w.delen[gat];
  return { ...w, gat, antwoord, keuzes: schud([antwoord, ...afleiders(antwoord, niveau, rnd)], rnd) };
}

function woordenVoor(niveau: number, kent: Kent): WoordInfo[] {
  const eigen = speelbareWoorden(kent);
  const pool = eigen.length >= 8 ? eigen : ALLE_WOORDEN;
  return niveau === 0 ? pool.filter((w) => w.delen.length === 3 && isKlinker(w.delen[1])) : pool.filter((w) => w.delen.length >= 3);
}

export function maakKluis(niveau: number, aantal: number, kent: Kent, rnd: Rnd = standaardRnd): KluisOpgave[] {
  const pool = schud(woordenVoor(niveau, kent), rnd);
  return pool.slice(0, aantal).map((w) => {
    const gat = niveau === 0 ? 1 : Math.floor(rnd() * w.delen.length);
    return bouwKluis(w, gat, niveau, rnd);
  });
}

export function kluisUitId(id: string, niveau: number, rnd: Rnd = standaardRnd): KluisOpgave | null {
  const m = /^kluis\.([a-z]+)\.(\d+)$/.exec(id);
  const w = m ? ALLE_WOORDEN.find((x) => x.woord === m[1]) : undefined;
  if (!m || !w || Number(m[2]) >= w.delen.length) return null;
  return bouwKluis(w, Number(m[2]), niveau, rnd);
}
