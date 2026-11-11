/**
 * Verzamelt alle teksten die de stem moet kunnen uitspreken.
 * tools/maak-audio.ts maakt hiervan mp3-bestanden, en een test bewaakt dat niets ontbreekt.
 */
import teksten from '../../content/teksten.json';
import characters from '../../content/characters.json';
import { LETTERS, ALLE_WOORDEN } from '../engine/generator-lucas';
import { SPELLEN } from '../games/spellen';
import type { Spreeksoort } from './hash';

export type TeSpreken = { tekst: string; soort: Spreeksoort };

/** Losse woorden bij sommen ("vier", "plus", "twee", "is", "zes"). */
export const SOM_WOORDEN = ['plus', 'min', 'is'];
/** Hoogste getal dat Lucas te horen krijgt (sommen en torens tot en met 20). */
export const MAX_GETAL = 20;
/** Prijzen en 'nog zoveel sparen' worden afgerond op 5: van 25 tot en met 200. */
export const SPAAR_GETALLEN = Array.from({ length: 36 }, (_, i) => 25 + i * 5);

function strings(x: unknown): string[] {
  if (typeof x === 'string') return [x];
  if (Array.isArray(x)) return x.flatMap(strings);
  if (x && typeof x === 'object') return Object.values(x).flatMap(strings);
  return [];
}

export function alleTeksten(): TeSpreken[] {
  const lijst: TeSpreken[] = [];
  const voeg = (tekst: string, soort: Spreeksoort) => lijst.push({ tekst, soort });

  strings(teksten).forEach((t) => voeg(t, 'instructie'));
  Object.values(characters).forEach((c) => voeg(c.intro, 'instructie'));
  strings(Object.values(characters).map((c) => c.complimenten)).forEach((t) => voeg(t, 'instructie'));

  // Wat elk spel is (de luidspreker in het spelmenu: Lucas leest nog niet)
  SPELLEN.forEach((sp) => voeg(sp.uitleg, 'instructie'));

  // Beginwoorden van de letters en alle woordjes (ook als de stem het woord na afloop herhaalt)
  LETTERS.forEach((l) => voeg(l.woord, 'woord'));
  ALLE_WOORDEN.forEach((w) => voeg(w.woord, 'woord'));

  for (let n = 0; n <= MAX_GETAL; n++) voeg(String(n), 'getal');
  // Prijzen en spaarbedragen in de winkel en de kleedkamer (veelvouden van 5)
  for (const n of SPAAR_GETALLEN) voeg(String(n), 'getal');
  SOM_WOORDEN.forEach((w) => voeg(w, 'getal'));

  // Dubbele eruit
  const gezien = new Set<string>();
  return lijst.filter(({ tekst, soort }) => {
    const k = `${soort}|${tekst}`;
    if (gezien.has(k)) return false;
    gezien.add(k);
    return true;
  });
}
