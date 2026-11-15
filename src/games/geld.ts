import { spreek } from '../audio/stem';
import teksten from '../../content/teksten.json';
/**
 * Bedragen die de stem kan uitspreken: tot 20 precies, daarboven afgerond naar boven op 5 (tot 200).
 * Daarvoor zijn opnames gemaakt (zie SPAAR_GETALLEN in alle-teksten.ts).
 */
export function spreekbaarBedrag(n: number): string | null {
  if (n <= 20) return String(Math.max(1, n));
  const r = Math.ceil(n / 5) * 5;
  return r <= 200 ? String(r) : null;
}

/**
 * Stukjes achter elkaar uitspreken; stopt zodra `nogActueel()` false geeft
 * (bijvoorbeeld omdat Lucas al op iets anders tikte).
 */
async function zegReeks(delen: [string, 'instructie' | 'getal'][], nogActueel: () => boolean) {
  for (const [tekst, soort] of delen) {
    if (!nogActueel()) return;
    await spreek(tekst, soort);
  }
}

/** "Dat kost 30 ringen." */
export const zegPrijs = (prijs: number, nogActueel: () => boolean) =>
  zegReeks([[teksten.winkel.kost, 'instructie'], [spreekbaarBedrag(prijs) ?? String(prijs), 'getal'], [teksten.winkel.ringen, 'instructie']], nogActueel);

/** "Nog 15 ringen sparen, Lucas!" (afgerond op 5 boven de 20). */
export function zegNogSparen(nog: number, nogActueel: () => boolean) {
  const w = teksten.winkel;
  if (nog <= 1) return spreek(w.nogEen);
  const bedrag = spreekbaarBedrag(nog);
  if (!bedrag) return spreek(w.sparen);
  return zegReeks([[w.nog, 'instructie'], [bedrag, 'getal'], [w.nogSparen, 'instructie']], nogActueel);
}
