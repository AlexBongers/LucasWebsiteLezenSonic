/**
 * Kopen, aanzetten en verdienen in de Turbo-winkel.
 */
import { ARTIKEL, MAX_VOORRAAD, type Soort } from '../games/winkel';
import { bewaar, vg } from './voortgang.svelte';

export type KoopUitslag = 'gekocht' | 'te-weinig' | 'al-van-hem' | 'vol';

export const heeft = (id: string) => vg.winkel.bezit.includes(id);
export const voorraad = (id: string) => vg.winkel.voorraad[id] ?? 0;
export const isAan = (soort: Soort, id: string) => (vg.winkel.gekozen as Record<string, string>)[soort] === id;

/** Gouden ringen erbij (een kristal, een volle plakboekbladzijde, of van papa of mama). */
export function verdien(n: number) {
  if (n <= 0) return;
  vg.ringen += n;
  void bewaar();
}

export function koop(id: string): KoopUitslag {
  const a = ARTIKEL[id];
  if (!a) return 'al-van-hem';
  if (a.soort === 'power') {
    if (voorraad(id) >= MAX_VOORRAAD) return 'vol';
  } else if (a.soort !== 'sticker' && heeft(id)) return 'al-van-hem';
  if (vg.ringen < a.prijs) return 'te-weinig';
  vg.ringen -= a.prijs;
  vg.winkel.uitgegeven += a.prijs;
  if (a.soort === 'power') vg.winkel.voorraad[id] = voorraad(id) + 1;
  else if (a.soort === 'sticker') {
    // Het zakje wordt meteen geopend door de winkel (openZakje).
  } else {
    vg.winkel.bezit = [...vg.winkel.bezit, id];
    // Meteen aan: dan ziet hij het verschil.
    (vg.winkel.gekozen as Record<string, string>)[a.soort] = id;
  }
  void bewaar();
  return 'gekocht';
}

/** Zet iets dat hij bezit aan of uit. Geeft terug of het nu aan staat. */
export function wissel(id: string): boolean {
  const a = ARTIKEL[id];
  if (!a || a.soort === 'power' || a.soort === 'sticker' || !heeft(id)) return false;
  const g = vg.winkel.gekozen as Record<string, string>;
  g[a.soort] = g[a.soort] === id ? '' : id;
  void bewaar();
  return g[a.soort] === id;
}

/** Eén powerup uit de voorraad halen. */
export function pakPowerup(id: string): boolean {
  if (voorraad(id) <= 0) return false;
  vg.winkel.voorraad[id] = voorraad(id) - 1;
  void bewaar();
  return true;
}
