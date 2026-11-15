/**
 * Rijm-raket: welk plaatje rijmt op het woord? Rijmen is luisteren, dus Lucas hoeft niet te lezen:
 * alle woordjes met een plaatje doen mee. Twee woorden rijmen als ze vanaf de laatste klinker hetzelfde klinken
 * (kat - rat, maan - kraan), en niet hetzelfde woord zijn. Alleen woorden van één lettergreep.
 *  niveau 0: de andere plaatjes hebben een andere klinker (kat: rat, vis, boom)
 *  niveau 1: de andere plaatjes lijken erop (zelfde klinker of zelfde beginletter: kat: rat, kam, kip)
 */
import { ALLE_WOORDEN, KLANKEN, type WoordInfo } from './generator-lucas';
import { schud, standaardRnd, type Rnd } from './toeval';

const KLINKERS = new Set(['a', 'e', 'i', 'o', 'u', ...KLANKEN.filter((k) => /[aeiou]/.test(k))]);
const isKlinker = (d: string) => KLINKERS.has(d);

/** Het rijmstuk: vanaf de laatste klinker ("kat" → "at", "maan" → "aan"). */
export function rijmDeel(w: WoordInfo): string {
  for (let i = w.delen.length - 1; i >= 0; i--) if (isKlinker(w.delen[i])) return w.delen.slice(i).join('');
  return w.woord;
}
const laatsteKlinker = (w: WoordInfo) => [...w.delen].reverse().find(isKlinker) ?? '';

export type RijmOpgave = { woord: string; emoji: string; rijm: string; keuzes: { woord: string; emoji: string }[] };
export const rijmId = (o: { woord: string; rijm: string }) => `rijm.${o.woord}.${o.rijm}`;
export const RIJM_MAX = 1;

/** Woorden van één lettergreep (één klinker): daar is rijmen betrouwbaar (spiegel en tandenborstel rijmen niet). */
const eenGreep = (w: WoordInfo) => w.delen.filter(isKlinker).length === 1;

/** Alle rijmparen uit de woordenlijst. */
export const RIJMPAREN: [WoordInfo, WoordInfo][] = (() => {
  const paren: [WoordInfo, WoordInfo][] = [];
  const kort = ALLE_WOORDEN.filter(eenGreep);
  for (const a of kort)
    for (const b of kort)
      if (a.woord !== b.woord && rijmDeel(a) === rijmDeel(b) && !a.woord.endsWith(b.woord) && !b.woord.endsWith(a.woord)) paren.push([a, b]);
  return paren;
})();

function bouwRijm(a: WoordInfo, b: WoordInfo, niveau: number, rnd: Rnd): RijmOpgave {
  const rijm = rijmDeel(a);
  const anderen = ALLE_WOORDEN.filter((w) => w.woord !== a.woord && rijmDeel(w) !== rijm);
  const lijkt = anderen.filter((w) => laatsteKlinker(w) === laatsteKlinker(a) || w.woord[0] === a.woord[0]);
  const verschil = anderen.filter((w) => laatsteKlinker(w) !== laatsteKlinker(a));
  const af = schud(niveau === 0 ? verschil : lijkt.length >= 2 ? lijkt : anderen, rnd).slice(0, 2);
  const keuzes = schud([b, ...af].map(({ woord, emoji }) => ({ woord, emoji })), rnd);
  return { woord: a.woord, emoji: a.emoji, rijm: b.woord, keuzes };
}

export function maakRijm(niveau: number, aantal: number, rnd: Rnd = standaardRnd): RijmOpgave[] {
  const uit: RijmOpgave[] = [];
  const gezien = new Set<string>();
  for (const [a, b] of schud(RIJMPAREN, rnd)) {
    if (uit.length >= aantal) break;
    if (gezien.has(a.woord) || gezien.has(b.woord)) continue;
    gezien.add(a.woord);
    uit.push(bouwRijm(a, b, niveau, rnd));
  }
  return uit;
}

export function rijmUitId(id: string, niveau: number, rnd: Rnd = standaardRnd): RijmOpgave | null {
  const m = /^rijm\.([a-z]+)\.([a-z]+)$/.exec(id);
  const a = m && ALLE_WOORDEN.find((w) => w.woord === m[1]);
  const b = m && ALLE_WOORDEN.find((w) => w.woord === m[2]);
  return a && b ? bouwRijm(a, b, niveau, rnd) : null;
}
