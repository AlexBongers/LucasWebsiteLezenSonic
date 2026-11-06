/**
 * Herhalingsdoosjes (PLAN.md §3.4): wat fout ging, komt vaker terug.
 *
 * Een opgave die niet meteen goed was, gaat in doos 1 en komt het volgende
 * ronde terug. Goed = een doos verder en pas later terugzien
 * (1, 3, 7, 14 dagen). Goed in doos 5 = gekend, uit de doosjes.
 * Weer fout = terug naar doos 1.
 */
export type DoosItem = {
  doos: number;
  /** Tijdstip (ms) vanaf wanneer de opgave weer mag terugkomen. */
  volgende: number;
  /** Niveau waarop de opgave hoort. */
  niveau: number;
};

export type Herhaling = Record<string, DoosItem>;

export const DOZEN = 5;
const DAG = 864e5;
/** Wachttijd in dagen nadat een opgave in deze doos terechtkomt. */
const WACHT: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };

export function verwerkAntwoord(h: Herhaling, id: string, goed: boolean, niveau: number, nu: number): Herhaling {
  const item = h[id];
  if (!goed) return { ...h, [id]: { doos: 1, volgende: nu, niveau } };
  if (!item) return h;
  const doos = item.doos + 1;
  if (doos > DOZEN) {
    const kopie = { ...h };
    delete kopie[id];
    return kopie;
  }
  return { ...h, [id]: { doos, volgende: nu + WACHT[doos] * DAG, niveau: item.niveau } };
}

/** Opgaven die nu aan de beurt zijn: eerst de laagste doos, dan de oudste. */
export function aanDeBeurt(h: Herhaling, voorvoegsel: string, nu: number): { id: string; niveau: number }[] {
  return Object.entries(h)
    .filter(([id, item]) => id.startsWith(voorvoegsel) && item.volgende <= nu)
    .sort(([, a], [, b]) => a.doos - b.doos || a.volgende - b.volgende)
    .map(([id, item]) => ({ id, niveau: item.niveau }));
}

export function inDoosjes(h: Herhaling, voorvoegsel: string): { id: string; item: DoosItem }[] {
  return Object.entries(h)
    .filter(([id]) => id.startsWith(voorvoegsel))
    .map(([id, item]) => ({ id, item }))
    .sort((a, b) => a.item.doos - b.item.doos);
}
