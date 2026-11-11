/** Controleer de opgeslagen uitslagen opnieuw (na een betere vergelijking), zonder iets opnieuw in te spreken. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isGoed } from './audio/controle';
import { getalInWoorden } from '../src/audio/getallen';
import { normaliseer } from '../src/audio/hash';

const pad = join(import.meta.dirname, 'audio-controle.json');
const c = JSON.parse(readFileSync(pad, 'utf8')) as Record<string, { tekst: string; soort: string; ok: boolean; gehoord: string }>;
let n = 0;
for (const u of Object.values(c)) {
  if (u.ok) continue;
  const t = normaliseer(u.tekst);
  const bedoeld = u.soort === 'getal' && /^\d+$/.test(t) ? getalInWoorden(Number(t)) : t;
  if (isGoed(bedoeld, u.gehoord) || isGoed(t, u.gehoord)) {
    u.ok = true;
    n++;
  }
}
writeFileSync(pad, JSON.stringify(c, null, 2) + '\n');
console.log(`${n} uitslagen alsnog goed.`);
