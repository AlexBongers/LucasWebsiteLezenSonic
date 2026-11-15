/**
 * Telvoorwerpen bij de sommen: niet steeds ringen, maar appels, auto's, eendjes, …
 * Per som vast gekozen (zelfde som = zelfde voorwerp), zodat het binnen een opgave rustig blijft.
 */
export const DINGEN = ['🍎', '🍓', '⭐', '🚗', '🐟', '🎈', '🍪', '🦆', '🐞', '🍌', '⚽', '🧁', '🐣', '🚀', '🍒', '🦋', '🐸', '🍩', '🌸', '🐢'];

export function dingVoor(a: number, b: number, op: '+' | '-'): string {
  return DINGEN[(a * 7 + b * 13 + (op === '-' ? 5 : 0)) % DINGEN.length];
}
