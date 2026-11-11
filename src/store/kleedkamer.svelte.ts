/**
 * Kleding kopen en aantrekken. Gekochte kleding is van Lucas en past op elke held.
 */
import { KLEDINGSTUK, type Kleding } from '../games/kleding';
import type { HeldId } from '../games/spellen';
import { bewaar, vg } from './voortgang.svelte';

export const heeftKleding = (id: string) => vg.winkel.bezit.includes(id);
export const kledingVan = (wie: HeldId): Kleding => vg.winkel.kleding[wie];

export function koopKleding(id: string, wie: HeldId): 'gekocht' | 'te-weinig' | 'al-van-hem' {
  const k = KLEDINGSTUK[id];
  if (!k || heeftKleding(id)) return 'al-van-hem';
  if (vg.ringen < k.prijs) return 'te-weinig';
  vg.ringen -= k.prijs;
  vg.winkel.uitgegeven += k.prijs;
  vg.winkel.bezit = [...vg.winkel.bezit, id];
  vg.winkel.kleding[wie][k.plek] = id;
  void bewaar();
  return 'gekocht';
}

/** Aan- of uittrekken bij één held. Geeft terug of het nu aan is. */
export function wisselKleding(id: string, wie: HeldId): boolean {
  const k = KLEDINGSTUK[id];
  if (!k || !heeftKleding(id)) return false;
  const kl = vg.winkel.kleding[wie];
  kl[k.plek] = kl[k.plek] === id ? '' : id;
  void bewaar();
  return kl[k.plek] === id;
}
