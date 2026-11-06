/**
 * Bestandsnaam voor een uitgesproken tekst. Wordt gedeeld door de site en
 * door tools/maak-audio.ts, zodat beide hetzelfde bestand vinden.
 */
export type Spreeksoort = 'instructie' | 'woord' | 'zin' | 'getal';

export function normaliseer(tekst: string): string {
  return tekst.replace(/\s+/g, ' ').trim();
}

/** cyrb53: snelle, stabiele hash (geen beveiliging nodig). */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** Naam van de stem in de bestandsnamen, inclusief versie (nieuwe versie = nieuwe opnames). */
export function stemSleutel(info: { stem: string; versie?: number }): string {
  return info.versie ? `${info.stem}@v${info.versie}` : info.stem;
}

export function audioSleutel(tekst: string, soort: Spreeksoort, stem: string): string {
  return cyrb53(`${stem}|${soort}|${normaliseer(tekst)}`);
}
