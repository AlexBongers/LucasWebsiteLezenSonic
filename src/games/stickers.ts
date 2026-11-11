/**
 * Stickers voor het plakboek. Elke sticker is een woordje uit de woordenlijst met zijn plaatje:
 * zo leest Lucas het woord eronder, en de stem zegt het als hij erop tikt.
 */
import { ALLE_WOORDEN } from '../engine/generator-lucas';

export type Bladzijde = { id: string; icoon: string; kleur: string; woorden: string[] };

export const BLADZIJDEN: Bladzijde[] = [
  { id: 'dieren', icoon: '🐾', kleur: '#22c55e', woorden: ['kat', 'kip', 'vis', 'vos', 'lam', 'rat', 'ram', 'krab', 'aap', 'eend', 'muis', 'bij', 'mier', 'koe'] },
  { id: 'thuis', icoon: '🏠', kleur: '#f59e0b', woorden: ['pan', 'pot', 'kom', 'kaas', 'kers', 'vork', 'mand', 'lamp', 'stoel', 'kaars', 'bed', 'deur', 'raam', 'klok', 'boek', 'pen'] },
  { id: 'lijf', icoon: '🧢', kleur: '#ec4899', woorden: ['pet', 'rok', 'sok', 'jas', 'tas', 'hoed', 'bril', 'man', 'hand', 'voet', 'lip', 'oog', 'oor', 'neus'] },
  { id: 'buiten', icoon: '🌳', kleur: '#3b82f6', woorden: ['tak', 'zon', 'bos', 'dak', 'tent', 'post', 'kerk', 'vlag', 'maan', 'roos', 'boom', 'boot', 'vuur', 'bus', 'bal', 'ster', 'pijl', 'trein', 'huis', 'bloem'] },
];

const EMOJI = new Map(ALLE_WOORDEN.map((w) => [w.woord, w.emoji]));
export const emojiVan = (woord: string) => EMOJI.get(woord) ?? '⭐';
export const ALLE_STICKERS = BLADZIJDEN.flatMap((b) => b.woorden);
export const bladzijdeVan = (woord: string) => BLADZIJDEN.find((b) => b.woorden.includes(woord))!;

/** Kans op een glimmende sticker. */
export const GLIM_KANS = 1 / 6;
/** Bonus voor een volle bladzijde. */
export const BLIKSEMS_VOLLE_BLADZIJDE = 5;

/**
 * Kies een sticker: meestal een die hij nog niet heeft (dan blijft het spannend),
 * soms een dubbele (die levert een bliksem op).
 */
export function kiesSticker(heeft: (w: string) => boolean, rnd: () => number = Math.random): string {
  const nieuw = ALLE_STICKERS.filter((w) => !heeft(w));
  const lijst = nieuw.length > 0 && rnd() < 0.8 ? nieuw : ALLE_STICKERS;
  return lijst[Math.floor(rnd() * lijst.length)];
}
