/**
 * Niveau-aanpassing per vaardigheid (PLAN.md §3.4).
 *
 * Alleen opgaven op het eigen niveau tellen mee. Zodra er 8 zijn (ook over
 * meerdere rondes heen) kijkt de site naar de laatste 10:
 * >85% goed = stapje omhoog, <60% goed = stapje omlaag, daartussen blijven.
 * Na een niveauwissel begint de telling opnieuw.
 */
export type Vaardigheid = {
  niveau: number;
  /** Laatste antwoorden op het eigen niveau (true = goed bij eerste poging), maximaal 20. Voor het overzicht. */
  recent: boolean[];
  /** Antwoorden sinds de laatste niveauwissel (maximaal 10). */
  opNiveau?: boolean[];
};

export const OMHOOG = 0.85;
export const OMLAAG = 0.6;
/** Na zoveel opgaven op een niveau wordt er gekeken of het omhoog of omlaag moet. */
export const VENSTER = 8;
const GEHEUGEN = 10;

export type Regels = { omhoog: number; omlaag: number; venster: number };
export const STANDAARD: Regels = { omhoog: OMHOOG, omlaag: OMLAAG, venster: VENSTER };
/** Rekenen: pas omhoog bij 90% goed over 10 sommen, sneller een stapje terug. */
export const REKEN_REGELS: Regels = { omhoog: 0.89, omlaag: 0.7, venster: 10 };

export function verwerkSessie(v: Vaardigheid, resultaten: boolean[], maxNiveau: number, regels: Regels = STANDAARD): Vaardigheid {
  const recent = [...v.recent, ...resultaten].slice(-20);
  const reeks = [...(v.opNiveau ?? []), ...resultaten].slice(-Math.max(GEHEUGEN, regels.venster));
  if (reeks.length < regels.venster) return { niveau: v.niveau, recent, opNiveau: reeks };
  const score = reeks.filter(Boolean).length / reeks.length;
  if (score > regels.omhoog && v.niveau < maxNiveau) return { niveau: v.niveau + 1, recent, opNiveau: [] };
  if (score < regels.omlaag && v.niveau > 0) return { niveau: v.niveau - 1, recent, opNiveau: [] };
  return { niveau: v.niveau, recent, opNiveau: reeks };
}

export function percentage(v: Vaardigheid): number | null {
  if (v.recent.length === 0) return null;
  return Math.round((v.recent.filter(Boolean).length / v.recent.length) * 100);
}

/** Zet een niveau met de hand (ouderhoek); de telling begint opnieuw. */
export function zetNiveau(v: Vaardigheid, niveau: number): Vaardigheid {
  return { niveau, recent: v.recent, opNiveau: [] };
}
