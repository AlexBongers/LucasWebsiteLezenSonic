/**
 * Powerups die nu actief zijn. Lucas zet ze aan tijdens een ronde (in de balk bovenin);
 * de spellen en de ronde-teller kijken hier naar.
 */
export const uitrusting = $state({
  /** Extra levens: een foutje kost dan niets. */
  hart: 0,
  /** Alle ringen tellen dubbel in deze ronde. */
  dubbel: false,
  /** De flits blijft langer in beeld in deze ronde. */
  traag: false,
});

let hartGebruikt = false;
/** Een extra leven is net gebruikt: de volgende "bijna"-zin vertelt dat. */
export const meldHartGebruikt = () => (hartGebruikt = true);
export function neemHartGebruikt(): boolean {
  const x = hartGebruikt;
  hartGebruikt = false;
  return x;
}

/** Aan het einde van een ronde: de powerups voor één ronde zijn op. */
export function nieuweRonde() {
  uitrusting.dubbel = false;
  uitrusting.traag = false;
}

/** Het slow-mo effect voor de flitsspellen. */
export const flitsMaal = () => (uitrusting.traag ? 1.8 : 1);
