/** Kleine hulpfuncties voor willekeur. `rnd` is te vervangen in tests. */
export type Rnd = () => number;

export const standaardRnd: Rnd = Math.random;

/** Geheel getal van `min` tot en met `max`. */
export function getal(min: number, max: number, rnd: Rnd = standaardRnd): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

export function kies<T>(lijst: readonly T[], rnd: Rnd = standaardRnd): T {
  return lijst[Math.floor(rnd() * lijst.length)];
}

export function schud<T>(lijst: readonly T[], rnd: Rnd = standaardRnd): T[] {
  const kopie = [...lijst];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/** Voorspelbare willekeur (mulberry32), handig voor tests. */
export function zaadRnd(zaad: number): Rnd {
  let a = zaad >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
