/**
 * Stickers voor het plakboek. Elke sticker is een woordje uit de woordenlijst met zijn plaatje:
 * zo leest Lucas het woord eronder, en de stem zegt het als hij erop tikt.
 */
import { ALLE_WOORDEN } from '../engine/generator-lucas';

export type Bladzijde = { id: string; icoon: string; kleur: string; woorden: string[] };

export const BLADZIJDEN: Bladzijde[] = [
  { id: 'dieren', icoon: '🐾', kleur: '#22c55e', woorden: ['kat', 'kip', 'vis', 'vos', 'lam', 'rat', 'ram', 'krab', 'aap', 'eend', 'muis', 'bij', 'mier', 'koe', 'kikker', 'varken', 'paard', 'haas', 'egel', 'slak', 'vogel'] },
  { id: 'wild', icoon: '🦁', kleur: '#f97316', woorden: ['otter', 'zebra', 'leeuw', 'tijger', 'beer', 'uil', 'slang', 'walvis', 'dolfijn', 'haai', 'kreeft', 'pinguin', 'spin'] },
  { id: 'eten', icoon: '🍎', kleur: '#ef4444', woorden: ['kaas', 'kers', 'spek', 'ananas', 'paprika', 'tomaat', 'banaan', 'druif', 'peer', 'citroen', 'wortel', 'ui', 'brood', 'ei', 'melk', 'ijs', 'taart', 'soep', 'friet'] },
  { id: 'thuis', icoon: '🏠', kleur: '#f59e0b', woorden: ['pan', 'pot', 'kom', 'vork', 'mand', 'lamp', 'stoel', 'kaars', 'bed', 'deur', 'raam', 'klok', 'pen', 'mes', 'mok', 'vat', 'spons', 'sleutel', 'lepel', 'schaar', 'krant'] },
  { id: 'spelen', icoon: '🎈', kleur: '#a855f7', woorden: ['piano', 'trompet', 'trommel', 'bal', 'pop', 'masker', 'ski', 'robot', 'dino', 'monster', 'bel', 'boek'] },
  { id: 'lijf', icoon: '🧢', kleur: '#ec4899', woorden: ['pet', 'rok', 'sok', 'jas', 'tas', 'hoed', 'bril', 'hand', 'voet', 'lip', 'oog', 'oor', 'neus', 'vest', 'helm', 'sjaal', 'schoen', 'handschoen', 'tand', 'duim'] },
  { id: 'mensen', icoon: '👑', kleur: '#eab308', woorden: ['man', 'oma', 'opa', 'kok', 'koning', 'prinses', 'heks', 'kroon'] },
  { id: 'buiten', icoon: '🌳', kleur: '#3b82f6', woorden: ['tak', 'zon', 'bos', 'dak', 'tent', 'post', 'kerk', 'vlag', 'maan', 'roos', 'boom', 'vuur', 'ster', 'pijl', 'huis', 'bloem', 'kasteel'] },
  { id: 'natuur', icoon: '⛰️', kleur: '#0ea5e9', woorden: ['net', 'rots', 'nest', 'regen', 'sneeuw', 'berg', 'vulkaan', 'eiland', 'regenboog'] },
  { id: 'reis', icoon: '🚗', kleur: '#64748b', woorden: ['bus', 'trein', 'boot', 'raket', 'motor', 'tram', 'kano', 'auto', 'vliegtuig'] },
];

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
