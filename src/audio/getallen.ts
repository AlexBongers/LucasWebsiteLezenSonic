/** Getallen als Nederlandse woorden, voor de stemgenerator. */
const EENHEDEN = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien',
  'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien'];
const TIENTALLEN = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'];

/** 47 → "zevenenveertig", zodat de stem het getal duidelijk in het Nederlands uitspreekt. */
export function getalInWoorden(n: number): string {
  if (n >= 100) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return `${h === 1 ? '' : getalInWoorden(h)}honderd${rest ? getalInWoorden(rest) : ''}`;
  }
  if (n < 20) return n === 1 ? 'één' : EENHEDEN[n];
  const t = TIENTALLEN[Math.floor(n / 10)];
  const e = n % 10;
  if (!e) return t;
  const een = e === 1 ? 'een' : EENHEDEN[e];
  return `${een}${/[ei]$/.test(een) ? 'ën' : 'en'}${t}`;
}

