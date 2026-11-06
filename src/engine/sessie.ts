/**
 * Een ronde plannen (PLAN.md §3.4).
 *
 * Mix: ongeveer 70% op zijn niveau, 20% een stapje makkelijker (succes-
 * ervaring), 10% een stapje moeilijker (uitdaging, bij rekenen uit). Opgaven uit de
 * herhalingsdoosjes die aan de beurt zijn, nemen een deel van de 70% in.
 *
 * Auditie: de eerste keer per spel 8 opgaven die oplopen in moeilijkheid.
 * Daarmee bepaalt de site het startniveau.
 */
import { schud, standaardRnd, type Rnd } from './toeval';

export type Bron = 'niveau' | 'makkelijk' | 'uitdaging' | 'herhaling' | 'auditie';

export type Gepland<T> = { opgave: T; id: string; niveau: number; bron: Bron };

export type Resultaat = {
  id: string;
  niveau: number;
  bron: Bron;
  /** Goed bij de eerste poging. */
  goed: boolean;
  /** Bij een fout: wat er als eerste gekozen werd (bijv. "licht" in plaats van "lucht"). */
  gekozen?: string;
};

export type Verdeling = { niveau: number; makkelijk: number; uitdaging: number; herhaling: number };

export function verdeling(
  aantal: number,
  kanOmlaag: boolean,
  kanOmhoog: boolean,
  beschikbareHerhaling: number,
  makkelijkDeel = 0.2,
): Verdeling {
  const uitdaging = kanOmhoog ? Math.max(1, Math.round(aantal * 0.1)) : 0;
  const makkelijk = kanOmlaag ? Math.round(aantal * makkelijkDeel) : 0;
  const herhaling = Math.min(beschikbareHerhaling, Math.round(aantal * 0.25));
  return { niveau: aantal - uitdaging - makkelijk - herhaling, makkelijk, uitdaging, herhaling };
}

export type PlanOpties<T> = {
  aantal: number;
  niveau: number;
  maxNiveau: number;
  /** Opgaven uit de doosjes die nu aan de beurt zijn. */
  herhaling: { id: string; niveau: number }[];
  /** Maak `n` nieuwe opgaven op een niveau. */
  maak: (niveau: number, n: number) => T[];
  /** Bouw een opgave terug op uit haar sleutel. */
  herbouw: (id: string) => T | null;
  id: (t: T) => string;
  /** Om dubbele te voorkomen (bijv. twee woorden uit hetzelfde groepje). */
  sleutel?: (t: T) => string;
  /** Een opgave van een niveau hoger erbij (standaard ja). */
  uitdaging?: boolean;
  /** Deel opgaven van een niveau lager (standaard 0,2). */
  makkelijk?: number;
  rnd?: Rnd;
};

export function planSessie<T>(o: PlanOpties<T>): Gepland<T>[] {
  const rnd = o.rnd ?? standaardRnd;
  const sleutel = o.sleutel ?? o.id;
  const gezien = new Set<string>();
  const neem = (t: T, niveau: number, bron: Bron): Gepland<T> | null => {
    const k = sleutel(t);
    if (gezien.has(k)) return null;
    gezien.add(k);
    return { opgave: t, id: o.id(t), niveau, bron };
  };

  const herhaling: Gepland<T>[] = [];
  for (const h of o.herhaling) {
    if (herhaling.length >= Math.round(o.aantal * 0.25)) break;
    const t = o.herbouw(h.id);
    const g = t && neem(t, h.niveau, 'herhaling');
    if (g) herhaling.push(g);
  }

  const v = verdeling(o.aantal, o.niveau > 0, (o.uitdaging ?? true) && o.niveau < o.maxNiveau, herhaling.length, o.makkelijk);
  const vul = (niveau: number, n: number, bron: Bron): Gepland<T>[] => {
    const uit: Gepland<T>[] = [];
    if (n <= 0) return uit;
    for (const t of o.maak(niveau, n + 6)) {
      if (uit.length >= n) break;
      const g = neem(t, niveau, bron);
      if (g) uit.push(g);
    }
    return uit;
  };

  const makkelijk = vul(o.niveau - 1, v.makkelijk, 'makkelijk');
  const eigen = vul(o.niveau, v.niveau + (v.makkelijk - makkelijk.length), 'niveau');
  const uitdaging = vul(o.niveau + 1, v.uitdaging, 'uitdaging');

  // Begin met iets makkelijks (opwarmen), de uitdaging ergens na het midden.
  const [opwarmer, ...restMakkelijk] = makkelijk;
  const midden = schud([...restMakkelijk, ...eigen, ...herhaling], rnd);
  const plek = Math.min(midden.length, Math.floor(o.aantal * 0.6));
  midden.splice(plek, 0, ...uitdaging);
  return opwarmer ? [opwarmer, ...midden] : midden;
}

export function planAuditie<T>(
  niveaus: readonly number[],
  maak: (niveau: number, n: number) => T[],
  id: (t: T) => string,
): Gepland<T>[] {
  const plan: Gepland<T>[] = [];
  const gezien = new Set<string>();
  for (const niveau of new Set(niveaus)) {
    const n = niveaus.filter((x) => x === niveau).length;
    let gedaan = 0;
    // Extra opgaven laten maken: dezelfde opgave mag niet op twee niveaus voorkomen.
    for (const t of maak(niveau, n + 8)) {
      if (gedaan >= n) break;
      if (gezien.has(id(t))) continue;
      gezien.add(id(t));
      plan.push({ opgave: t, id: id(t), niveau, bron: 'auditie' });
      gedaan++;
    }
  }
  return plan;
}

/**
 * Startniveau na de auditie: het eerste niveau waar minder dan `drempel`
 * meteen goed was (standaard 2 van de 3). Gaat alles goed, dan het hoogste niveau.
 */
export function auditieUitslag(resultaten: Pick<Resultaat, 'niveau' | 'goed'>[], maxNiveau: number, drempel = 2 / 3): number {
  for (let n = 0; n <= maxNiveau; n++) {
    const op = resultaten.filter((r) => r.niveau === n);
    if (op.length === 0) continue;
    if (op.filter((r) => r.goed).length / op.length < drempel - 1e-9) return n;
  }
  return maxNiveau;
}
