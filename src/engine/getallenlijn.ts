/**
 * Getallenbaan: de getallen op een rij. Welk getal komt erna, ervoor, of mist er?
 *  niveau 0: tot 10, erna en ervoor
 *  niveau 1: tot 20, ook een gat in de rij
 *  niveau 2: tot 20, sprongen van 2 (2, 4, 6, ?) en terugtellen
 */
import { getal, schud, standaardRnd, type Rnd } from './toeval';

export type BaanSoort = 'na' | 'voor' | 'gat' | 'sprong';
export type BaanOpgave = { soort: BaanSoort; rij: number[]; gat: number; antwoord: number; keuzes: number[] };
export const baanId = (o: { soort: BaanSoort; rij: number[]; gat: number }) => `baan.${o.soort}.${o.rij[0]}.${o.rij[1] - o.rij[0]}.${o.gat}`;
export const BAAN_MAX = 2;

function bouw(soort: BaanSoort, start: number, stap: number, gat: number, rnd: Rnd): BaanOpgave {
  const rij = Array.from({ length: 6 }, (_, i) => start + i * stap);
  const antwoord = rij[gat];
  const af = schud([antwoord + 1, antwoord - 1, antwoord + 2, antwoord - 2, antwoord + stap * 2].filter((x) => x >= 0 && x <= 22 && x !== antwoord), rnd);
  return { soort, rij, gat, antwoord, keuzes: schud([antwoord, ...[...new Set(af)].slice(0, 2)], rnd) };
}

export function maakBaan(niveau: number, aantal: number, rnd: Rnd = standaardRnd): BaanOpgave[] {
  const hoog = niveau === 0 ? 10 : 20;
  const soorten: BaanSoort[] = niveau === 0 ? ['na', 'voor'] : niveau === 1 ? ['na', 'voor', 'gat'] : ['gat', 'sprong', 'voor', 'sprong'];
  const uit: BaanOpgave[] = [];
  const gezien = new Set<string>();
  for (let p = 0; uit.length < aantal && p < aantal * 60; p++) {
    const soort = soorten[Math.floor(rnd() * soorten.length)];
    const stap = soort === 'sprong' ? (rnd() < 0.5 ? 2 : -2) : 1;
    const lengte = 5 * Math.abs(stap);
    const start = stap > 0 ? getal(niveau === 0 ? 1 : 0, hoog - lengte, rnd) : getal(lengte + 1, hoog, rnd);
    const gat = soort === 'na' || soort === 'sprong' ? 5 : soort === 'voor' ? 0 : getal(1, 4, rnd);
    const o = bouw(soort, start, stap, gat, rnd);
    const k = baanId(o);
    if (gezien.has(k) || Math.max(...o.rij) > hoog || Math.min(...o.rij) < 0) continue;
    gezien.add(k);
    uit.push(o);
  }
  return uit;
}

export function baanUitId(id: string, rnd: Rnd = standaardRnd): BaanOpgave | null {
  const m = /^baan\.(na|voor|gat|sprong)\.(\d+)\.(-?\d+)\.(\d)$/.exec(id);
  return m ? bouw(m[1] as BaanSoort, Number(m[2]), Number(m[3]), Number(m[4]), rnd) : null;
}
