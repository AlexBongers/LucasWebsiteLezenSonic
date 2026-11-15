/**
 * Stickers voor het plakboek. Elke sticker is een woordje uit de woordenlijst met zijn plaatje:
 * zo leest Lucas het woord eronder, en de stem zegt het als hij erop tikt.
 */
import { ALLE_WOORDEN } from '../engine/generator-lucas';
import woordData from '../../content/woorden.json';

export type Bladzijde = {
  /** Uniek per bladzijde ("eten", "eten-2"). */
  id: string;
  /** De categorie (voor de naam die de stem zegt). */
  soort: string;
  /** Volgnummer als een categorie over meer bladzijden loopt (1, 2, …). */
  deel: number;
  icoon: string;
  kleur: string;
  woorden: string[];
};

/** Elke categorie van het plakboek; de woorden en hun categorie staan in content/woorden.json. */
const SOORTEN: { soort: string; icoon: string; kleur: string }[] = [
  { soort: 'dieren', icoon: '🐾', kleur: '#22c55e' },
  { soort: 'wild', icoon: '🦁', kleur: '#f97316' },
  { soort: 'zee', icoon: '🌊', kleur: '#0284c7' },
  { soort: 'eten', icoon: '🍎', kleur: '#ef4444' },
  { soort: 'snoep', icoon: '🍭', kleur: '#db2777' },
  { soort: 'thuis', icoon: '🏠', kleur: '#f59e0b' },
  { soort: 'spelen', icoon: '🎈', kleur: '#a855f7' },
  { soort: 'lijf', icoon: '🧢', kleur: '#ec4899' },
  { soort: 'mensen', icoon: '👑', kleur: '#eab308' },
  { soort: 'buiten', icoon: '🌳', kleur: '#3b82f6' },
  { soort: 'natuur', icoon: '⛰️', kleur: '#0ea5e9' },
  { soort: 'reis', icoon: '🚗', kleur: '#64748b' },
];
/** Zoveel stickers passen er op één bladzijde (7 per rij, 3 rijen). */
export const PER_BLADZIJDE = 21;

function maakBladzijden(): Bladzijde[] {
  const lijst = woordData.woorden as [string, string, string][];
  const uit: Bladzijde[] = [];
  for (const s of SOORTEN) {
    const woorden = lijst.filter((w) => w[2] === s.soort).map((w) => w[0]);
    for (let i = 0; i * PER_BLADZIJDE < woorden.length; i++) {
      uit.push({ ...s, id: i === 0 ? s.soort : `${s.soort}-${i + 1}`, deel: i + 1, woorden: woorden.slice(i * PER_BLADZIJDE, (i + 1) * PER_BLADZIJDE) });
    }
  }
  return uit;
}

export const BLADZIJDEN: Bladzijde[] = maakBladzijden();

const EMOJI = new Map(ALLE_WOORDEN.map((w) => [w.woord, w.emoji]));
export const emojiVan = (woord: string) => EMOJI.get(woord) ?? '⭐';
export const ALLE_STICKERS = BLADZIJDEN.flatMap((b) => b.woorden);
export const bladzijdeVan = (woord: string) => BLADZIJDEN.find((b) => b.woorden.includes(woord))!;

/** Kans op een glimmende sticker. */
export const GLIM_KANS = 1 / 6;
/** Bonus voor een volle bladzijde. */
export const RINGEN_VOLLE_BLADZIJDE = 40;
/** Ringen voor een dubbele sticker. */
export const RINGEN_DUBBEL = 5;

/**
 * Kies een sticker: meestal een die hij nog niet heeft (dan blijft het spannend),
 * soms een dubbele (die levert ringen op).
 */
export function kiesSticker(heeft: (w: string) => boolean, rnd: () => number = Math.random): string {
  const nieuw = ALLE_STICKERS.filter((w) => !heeft(w));
  const lijst = nieuw.length > 0 && rnd() < 0.8 ? nieuw : ALLE_STICKERS;
  return lijst[Math.floor(rnd() * lijst.length)];
}
