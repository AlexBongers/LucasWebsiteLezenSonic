/**
 * De kleedkamer: kleding voor Sonic, Tails en Knuckles. Lucas koopt iets één keer met gouden ringen
 * en kan het daarna bij elke held aan- en uittrekken. De namen (en de stem) staan in teksten.json onder "kleedkamer".
 */
export type Plek = 'hoofd' | 'bril' | 'schoen' | 'rug';
export type Kleding = Record<Plek, string>;
export type KledingStuk = { id: string; plek: Plek; prijs: number; icoon: string; kleur: string };

export const PLEKKEN: { plek: Plek; icoon: string }[] = [
  { plek: 'hoofd', icoon: '🎩' },
  { plek: 'bril', icoon: '🕶️' },
  { plek: 'schoen', icoon: '👟' },
  { plek: 'rug', icoon: '🦸' },
];

export const KLEDING: KledingStuk[] = [
  { id: 'pet', plek: 'hoofd', prijs: 30, icoon: '🧢', kleur: '#2563eb' },
  { id: 'feestmuts', plek: 'hoofd', prijs: 40, icoon: '🥳', kleur: '#ec4899' },
  { id: 'koptelefoon', plek: 'hoofd', prijs: 50, icoon: '🎧', kleur: '#64748b' },
  { id: 'cowboyhoed', plek: 'hoofd', prijs: 60, icoon: '🤠', kleur: '#92400e' },
  { id: 'kroon', plek: 'hoofd', prijs: 100, icoon: '👑', kleur: '#f59e0b' },
  { id: 'zonnebril', plek: 'bril', prijs: 40, icoon: '🕶️', kleur: '#0f172a' },
  { id: 'skibril', plek: 'bril', prijs: 50, icoon: '🥽', kleur: '#06b6d4' },
  { id: 'blauweschoenen', plek: 'schoen', prijs: 25, icoon: '👟', kleur: '#2563eb' },
  { id: 'groeneschoenen', plek: 'schoen', prijs: 25, icoon: '👟', kleur: '#16a34a' },
  { id: 'gouden_schoenen', plek: 'schoen', prijs: 60, icoon: '👟', kleur: '#f59e0b' },
  { id: 'regenboogschoenen', plek: 'schoen', prijs: 80, icoon: '🌈', kleur: '#a855f7' },
  { id: 'rugzak', plek: 'rug', prijs: 50, icoon: '🎒', kleur: '#16a34a' },
  { id: 'cape', plek: 'rug', prijs: 60, icoon: '🦸', kleur: '#dc2626' },
  { id: 'vleugels', plek: 'rug', prijs: 100, icoon: '🪽', kleur: '#e0f2fe' },
];

export const KLEDINGSTUK = Object.fromEntries(KLEDING.map((k) => [k.id, k])) as Record<string, KledingStuk>;
export const kledingVoor = (p: Plek) => KLEDING.filter((k) => k.plek === p);
export const geenKleding = (): Kleding => ({ hoofd: '', bril: '', schoen: '', rug: '' });

/** Schoenkleur (licht en donker) voor 2D en 3D. */
export const SCHOEN: Record<string, [string, string]> = {
  blauweschoenen: ['#3b82f6', '#1e3a8a'],
  groeneschoenen: ['#22c55e', '#14532d'],
  gouden_schoenen: ['#fbbf24', '#92400e'],
  regenboogschoenen: ['#a855f7', '#be185d'],
};
