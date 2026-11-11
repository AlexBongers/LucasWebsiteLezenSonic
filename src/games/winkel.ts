/**
 * De Turbo-winkel: wat Lucas met zijn bliksemschichten kan kopen.
 * Powerups kun je opgebruiken; al het andere is voor altijd van hem en kan hij aan- of uitzetten.
 * De namen en uitleg (die de stem uitspreekt) staan in content/teksten.json onder "winkel.artikelen".
 */
export type Soort = 'power' | 'sticker' | 'maatje' | 'ring' | 'feest' | 'wereld' | 'held';

export type Artikel = {
  id: string;
  soort: Soort;
  /** Prijs in bliksems. */
  prijs: number;
  icoon: string;
  kleur: string;
};

export const SOORTEN: { soort: Soort; icoon: string; naam: string }[] = [
  { soort: 'power', icoon: '⚡', naam: 'Powerups' },
  { soort: 'sticker', icoon: '📒', naam: 'Stickers' },
  { soort: 'maatje', icoon: '🐥', naam: 'Maatjes' },
  { soort: 'ring', icoon: '💍', naam: 'Ringen' },
  { soort: 'feest', icoon: '🎆', naam: 'Feest' },
  { soort: 'wereld', icoon: '🚀', naam: 'Werelden' },
  { soort: 'held', icoon: '🌟', naam: 'Helden' },
];

export const ARTIKELEN: Artikel[] = [
  // Powerups
  { id: 'hart', soort: 'power', prijs: 3, icoon: '❤️', kleur: '#ef4444' },
  { id: 'dubbel', soort: 'power', prijs: 4, icoon: '✨', kleur: '#f59e0b' },
  { id: 'vuur', soort: 'power', prijs: 4, icoon: '🔥', kleur: '#f97316' },
  { id: 'traag', soort: 'power', prijs: 3, icoon: '🐢', kleur: '#22c55e' },
  // Stickerzakjes voor het plakboek (meteen open)
  { id: 'zakje', soort: 'sticker', prijs: 5, icoon: '🎁', kleur: '#a855f7' },
  { id: 'glimzakje', soort: 'sticker', prijs: 8, icoon: '✨', kleur: '#ec4899' },
  // Maatjes die meekijken
  { id: 'kuiken', soort: 'maatje', prijs: 6, icoon: '🐥', kleur: '#facc15' },
  { id: 'vos', soort: 'maatje', prijs: 10, icoon: '🦊', kleur: '#fb923c' },
  { id: 'draak', soort: 'maatje', prijs: 14, icoon: '🐲', kleur: '#4ade80' },
  { id: 'eenhoorn', soort: 'maatje', prijs: 18, icoon: '🦄', kleur: '#f0abfc' },
  // Ringen in een andere kleur
  { id: 'zilver', soort: 'ring', prijs: 8, icoon: '🥈', kleur: '#cbd5e1' },
  { id: 'roze', soort: 'ring', prijs: 8, icoon: '🩷', kleur: '#f472b6' },
  { id: 'regenboog', soort: 'ring', prijs: 14, icoon: '🌈', kleur: '#38bdf8' },
  // Feesteffecten
  { id: 'bliksemfeest', soort: 'feest', prijs: 10, icoon: '⚡', kleur: '#fde047' },
  { id: 'hartjes', soort: 'feest', prijs: 10, icoon: '💖', kleur: '#f472b6' },
  { id: 'vuurwerk', soort: 'feest', prijs: 14, icoon: '🎆', kleur: '#a78bfa' },
  // Een andere wereld
  { id: 'ruimte', soort: 'wereld', prijs: 20, icoon: '🪐', kleur: '#6366f1' },
  // Gouden helden
  { id: 'super', soort: 'held', prijs: 25, icoon: '🌟', kleur: '#fbbf24' },
];

export const ARTIKEL = Object.fromEntries(ARTIKELEN.map((a) => [a.id, a])) as Record<string, Artikel>;
export const artikelenVan = (s: Soort) => ARTIKELEN.filter((a) => a.soort === s);

/** Hoeveel van één powerup mag Lucas hebben? */
export const MAX_VOORRAAD = 9;

/** Bliksems voor een afgeronde ronde: 1, 2 of 3 (net als de sterren). */
export function bliksemsVoorRonde(goed: number, totaal: number): number {
  if (totaal === 0) return 3;
  const f = goed / totaal;
  return f >= 0.85 ? 3 : f >= 0.6 ? 2 : 1;
}

/** Bliksems voor een turbokristal van de dagmissie. */
export const BLIKSEMS_KRISTAL = 5;

/** CSS-filter waarmee de gouden ringen een andere kleur krijgen. */
export const RING_FILTER: Record<string, string> = {
  '': 'none',
  zilver: 'grayscale(1) brightness(1.3) contrast(1.05)',
  roze: 'hue-rotate(290deg) saturate(1.5)',
  regenboog: 'none',
};
