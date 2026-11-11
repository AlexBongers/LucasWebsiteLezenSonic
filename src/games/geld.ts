/**
 * Bedragen die de stem kan uitspreken: tot 20 precies, daarboven afgerond naar boven op 5 (tot 200).
 * Daarvoor zijn opnames gemaakt (zie SPAAR_GETALLEN in alle-teksten.ts).
 */
export function spreekbaarBedrag(n: number): string | null {
  if (n <= 20) return String(Math.max(1, n));
  const r = Math.ceil(n / 5) * 5;
  return r <= 200 ? String(r) : null;
}
