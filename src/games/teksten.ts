import teksten from '../../content/teksten.json';
import characters from '../../content/characters.json';
import { schud } from '../engine/toeval';
import { neemHartGebruikt } from './uitrusting.svelte';

export { teksten };

/**
 * "Zakje trekken": elke zin komt pas terug als alle andere al geweest zijn,
 * en nooit twee keer dezelfde direct na elkaar.
 */
const zakjes = new Map<string, { inhoud: string[]; laatste?: string }>();

export function uitZak(naam: string, lijst: readonly string[]): string {
  let zak = zakjes.get(naam);
  if (!zak || zak.inhoud.length === 0) {
    let nieuw = schud(lijst);
    if (zak?.laatste && nieuw[0] === zak.laatste && nieuw.length > 1) nieuw = [...nieuw.slice(1), nieuw[0]];
    zak = { inhoud: nieuw, laatste: zak?.laatste };
    zakjes.set(naam, zak);
  }
  const zin = zak.inhoud.shift()!;
  zak.laatste = zin;
  return zin;
}

type Wie = keyof typeof characters;
let teller = 0;
let wachtendeCombo: number | null = null;

/** Een reeks goede antwoorden is bereikt: het volgende compliment wordt dan een combo-juichkreet. */
export function zetCombo(n: number) {
  wachtendeCombo = n;
}

/**
 * Een compliment: afwisselend algemeen, met Lucas' naam, of van de held zelf.
 * Na een combo (3, 5, 8 of 12 op rij) hoort Lucas eerst hoe goed hij bezig is.
 */
export function compliment(wie?: Wie): string {
  if (wachtendeCombo !== null) {
    const n = wachtendeCombo;
    wachtendeCombo = null;
    const lijst = (teksten.combo as Record<string, string[]>)[String(n)];
    if (lijst) return uitZak(`combo-${n}`, lijst);
  }
  teller++;
  const r = teller % 5;
  if (r === 1 || r === 3) return uitZak('lucas', teksten.complimentenLucas);
  if (r === 4 && wie) return uitZak(`held-${wie}`, characters[wie].complimenten);
  return uitZak('algemeen', teksten.complimenten);
}

/** Na een fout: afwisselend algemeen en met Lucas' naam. */
let bijnaTeller = 0;
export function bijna(): string {
  // Een extra leven heeft de fout opgevangen: dat mag hij horen.
  if (neemHartGebruikt()) return uitZak('hart', teksten.winkel.hartGebruikt);
  bijnaTeller++;
  return bijnaTeller % 2 === 0 ? uitZak('bijna-lucas', teksten.bijnaLucas) : uitZak('bijna', teksten.bijna);
}

/** Een aanmoediging voor het begin van een ronde. Om de andere ronde, zodat het niet gaat vervelen. */
let rondeTeller = 0;
export function rondeStart(): string {
  rondeTeller++;
  return rondeTeller % 2 === 1 ? uitZak('ronde', teksten.rondeStart) : '';
}

export const beloning = () => uitZak('beloning', teksten.beloningen);
export const wacht = (ms: number) => new Promise((r) => setTimeout(r, ms));
