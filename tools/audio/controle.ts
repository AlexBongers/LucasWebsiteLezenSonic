/**
 * Controle van de uitspraak: een opname wordt teruggetranscribeerd en vergeleken met de bedoelde tekst.
 */
import { getalInWoorden } from '../../src/audio/getallen';

/** Zet een tekst om naar een vergelijkbare vorm: kleine letters, zonder leestekens, getallen als woorden. */
export function normaliseerTekst(t: string): string {
  const metGetallen = t.replace(/\d+/g, (d) => (Number(d) <= 999 ? ` ${getalInWoorden(Number(d))} ` : d));
  return metGetallen
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function afstand(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

/** Hoe goed past het transcript bij de bedoelde tekst? 1 = precies, 0 = niets. Spaties tellen niet mee ("zeven en veertig" = "zevenenveertig"). */
export function gelijkenis(bedoeld: string, gehoord: string): number {
  const a = normaliseerTekst(bedoeld).replace(/ /g, '');
  const b = normaliseerTekst(gehoord).replace(/ /g, '');
  if (!a && !b) return 1;
  return 1 - afstand(a, b) / Math.max(a.length, b.length, 1);
}

/** Korte teksten (losse woorden en getallen) moeten precies kloppen, langere mogen een kleine afwijking hebben. */
export function isGoed(bedoeld: string, gehoord: string): boolean {
  const kort = normaliseerTekst(bedoeld).replace(/ /g, '').length <= 12;
  return kort ? gelijkenis(bedoeld, gehoord) === 1 : gelijkenis(bedoeld, gehoord) >= 0.9;
}
