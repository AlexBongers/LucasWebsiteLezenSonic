import { describe, expect, it } from 'vitest';
import {
  ALLE_WOORDEN, bekendeLetters, klanken, LETTERS, maakBouw, maakKent, maakRing, maakSmash, maakSommen, maakTel, maakWoordRace,
  nieuweFlitstijd, FLITS_MAX, FLITS_MIN, smashWoorden, somNiveau, somUitId, somId, speelbareWoorden, STANDAARD_KENT, telUitId, woordenVoorNiveau,
} from '../src/engine/generator-lucas';
import { alleTeksten, MAX_GETAL } from '../src/audio/alle-teksten';
import { zaadRnd } from '../src/engine/toeval';

const uniek = <T>(l: T[]) => new Set(l.map((x) => JSON.stringify(x))).size === l.length;
const kent = maakKent(STANDAARD_KENT);

describe('letters en woorden', () => {
  it('elke letter heeft een beginwoord dat met die letter begint', () => {
    for (const l of LETTERS) expect(l.woord[0]).toBe(l.letter);
    expect(uniek(LETTERS.map((l) => l.emoji))).toBe(true);
  });
  it('plaatjes van woordjes komen maar één keer voor', () => {
    expect(uniek(ALLE_WOORDEN.map((w) => w.emoji))).toBe(true);
    expect(uniek(ALLE_WOORDEN.map((w) => w.woord))).toBe(true);
  });
  it('klanken splitst lange klanken', () => {
    expect(klanken('maan')).toEqual(['m', 'aa', 'n']);
    expect(klanken('kat')).toEqual(['k', 'a', 't']);
    expect(klanken('trein')).toEqual(['t', 'r', 'ei', 'n']);
    expect(klanken('bloem')).toEqual(['b', 'l', 'oe', 'm']);
  });
  it('speelbare woordjes gebruiken alleen bekende letters en klanken', () => {
    for (const w of speelbareWoorden(kent)) for (const d of w.delen) expect(kent.has(d)).toBe(true);
    // Zonder de lange klanken geen "maan"; met de klank wel.
    expect(speelbareWoorden(kent).some((w) => w.woord === 'maan')).toBe(false);
    expect(speelbareWoorden(maakKent([...STANDAARD_KENT, 'aa'])).some((w) => w.woord === 'maan')).toBe(true);
  });
  it('te weinig bekende letters geeft toch een bruikbare ronde', () => {
    const leeg = maakKent(['m']);
    expect(bekendeLetters(leeg).length).toBeGreaterThanOrEqual(4);
    expect(speelbareWoorden(leeg).length).toBeGreaterThanOrEqual(6);
  });
  it('niveaus: drie klanken of vier en meer', () => {
    const alles = maakKent([...STANDAARD_KENT, 'aa', 'oo', 'oe', 'ie', 'eu', 'ui', 'ei', 'ij', 'b', 'd', 'h', 'l', 'z', 'w', 'j', 'f', 'g', 'uu', 'ou', 'au']);
    expect(woordenVoorNiveau(0, alles).every((w) => w.delen.length <= 3)).toBe(true);
    expect(woordenVoorNiveau(1, alles).every((w) => w.delen.length >= 4)).toBe(true);
  });
});

describe('Ring-race', () => {
  it('3 verschillende keuzes met de goede letter erbij, alleen bekende letters', () => {
    for (const niveau of [0, 1]) {
      for (const o of maakRing(niveau, 8, kent, zaadRnd(niveau + 1))) {
        expect(o.keuzes).toHaveLength(3);
        expect(uniek(o.keuzes)).toBe(true);
        expect(o.keuzes).toContain(o.letter);
        for (const k of o.keuzes) expect(kent.has(k)).toBe(true);
      }
    }
  });
  it('niveau 2 zet lettervriendjes bij elkaar als hij ze beide kent', () => {
    const bd = maakKent([...STANDAARD_KENT, 'b', 'd']);
    const o = maakRing(1, 40, bd, zaadRnd(7)).filter((x) => x.letter === 'b');
    expect(o.length).toBeGreaterThan(0);
    for (const x of o) expect(x.keuzes).toContain('d');
  });
  it('geen dubbele letters in een ronde', () => {
    expect(uniek(maakRing(0, 8, kent, zaadRnd(2)).map((o) => o.letter))).toBe(true);
  });
});

describe('Woord-race en Woord-bouwen', () => {
  it('3 plaatjes, het goede erbij, nooit twee keer hetzelfde plaatje', () => {
    for (const o of maakWoordRace(0, 10, kent, zaadRnd(3))) {
      expect(o.keuzes).toHaveLength(3);
      expect(uniek(o.keuzes.map((k) => k.emoji))).toBe(true);
      expect(o.keuzes.some((k) => k.woord === o.woord)).toBe(true);
    }
  });
  it('bouwen: de stenen bevatten precies de klanken (niveau 2: twee extra) en staan niet meteen goed', () => {
    for (const o of maakBouw(0, 10, kent, zaadRnd(4))) {
      expect([...o.tegels].sort()).toEqual([...o.delen].sort());
      expect(o.tegels.join('') === o.delen.join('') && new Set(o.delen).size > 1).toBe(false);
    }
    const alles = maakKent([...STANDAARD_KENT, 'b', 'd', 'l', 'h']);
    for (const o of maakBouw(1, 10, alles, zaadRnd(5))) expect(o.tegels.length).toBe(o.delen.length + 2);
  });
});

describe('Letter-smash', () => {
  it('de beginletter staat tussen de stenen en alleen bekende letters', () => {
    for (const niveau of [0, 1]) {
      for (const o of maakSmash(niveau, 10, kent, zaadRnd(6))) {
        expect(o.keuzes).toContain(o.letter);
        expect(o.keuzes).toHaveLength(niveau === 0 ? 3 : 4);
        expect(o.letter).toBe(o.woord[0]);
        for (const k of o.keuzes) expect(kent.has(k)).toBe(true);
      }
    }
  });
  it('woorden zonder plaatje-dubbelen', () => {
    const w = smashWoorden(kent);
    expect(uniek(w.map((x) => x.woord))).toBe(true);
    expect(w.length).toBeGreaterThan(20);
  });
});

describe('Katapult-sommen', () => {
  it('blijft binnen het niveau en het goede antwoord staat tussen de keuzes', () => {
    const rnd = zaadRnd(8);
    const grenzen = [5, 10, 10, 10, 20];
    for (let n = 0; n <= 4; n++) {
      for (const s of maakSommen(n, 30, rnd)) {
        expect(Math.max(s.a, s.antwoord)).toBeLessThanOrEqual(grenzen[n]);
        expect(s.antwoord).toBeGreaterThanOrEqual(1 - (n === 0 ? 1 : 0));
        expect(s.keuzes).toContain(s.antwoord);
        expect(uniek(s.keuzes)).toBe(true);
        expect(s.keuzes.length).toBe(somNiveau(s.a, s.op, s.b) <= 1 ? 3 : 4);
        for (const k of s.keuzes) expect(k).toBeGreaterThanOrEqual(0);
        if (n >= 4 && s.a > 10) {
          // Zonder over het tiental: de eenheden passen binnen het tiental.
          const e = s.a % 10;
          expect(s.op === '+' ? e + s.b <= 9 || s.a === 10 : s.b <= e).toBe(true);
        }
      }
    }
  });
  it('plus-niveaus hebben geen min en andersom', () => {
    const rnd = zaadRnd(9);
    expect(maakSommen(0, 20, rnd).every((s) => s.op === '+')).toBe(true);
    expect(maakSommen(1, 20, rnd).every((s) => s.op === '+')).toBe(true);
    expect(maakSommen(2, 20, rnd).every((s) => s.op === '-')).toBe(true);
  });
  it('terug van id naar som', () => {
    expect(somUitId('som.7-3')!.antwoord).toBe(4);
    expect(somId({ a: 7, op: '-', b: 3 })).toBe('som.7-3');
    expect(somUitId('rommel')).toBeNull();
  });
});

describe('Tel & Bouw', () => {
  it('bouwen en tellen wisselen per niveau, binnen 10 of 20', () => {
    const rnd = zaadRnd(10);
    expect(maakTel(0, 8, rnd).every((o) => o.soort === 'bouw' && o.n <= 10)).toBe(true);
    expect(maakTel(1, 8, rnd).every((o) => o.soort === 'tel' && o.n <= 10 && o.keuzes!.includes(o.n))).toBe(true);
    expect(maakTel(2, 8, rnd).every((o) => o.soort === 'bouw' && o.n >= 11 && o.n <= 20)).toBe(true);
    expect(maakTel(3, 8, rnd).every((o) => o.soort === 'tel' && o.n >= 11 && uniek(o.keuzes!))).toBe(true);
  });
  it('terug van id', () => {
    expect(telUitId('tel.tel.7')!.keuzes).toContain(7);
    expect(telUitId('tel.bouw.12')!.soort).toBe('bouw');
  });
});

describe('flitstijd', () => {
  it('blijft tussen de grenzen', () => {
    let t = 1800;
    for (let i = 0; i < 100; i++) t = nieuweFlitstijd(t, true);
    expect(t).toBe(FLITS_MIN);
    for (let i = 0; i < 100; i++) t = nieuweFlitstijd(t, false);
    expect(t).toBe(FLITS_MAX);
  });
});

describe('alles wordt door de ingesproken stem gezegd', () => {
  const lijst = new Set(alleTeksten().map((t) => `${t.soort}|${t.tekst}`));
  it('alle woorden en beginwoorden', () => {
    for (const l of LETTERS) expect(lijst.has(`woord|${l.woord}`)).toBe(true);
    for (const w of ALLE_WOORDEN) expect(lijst.has(`woord|${w.woord}`)).toBe(true);
  });
  it('alle getallen die in een som, antwoord of toren kunnen voorkomen', () => {
    const rnd = zaadRnd(11);
    const nodig = new Set<number>();
    for (let n = 0; n <= 4; n++) for (const s of maakSommen(n, 60, rnd)) [s.a, s.b, s.antwoord, ...s.keuzes].forEach((x) => nodig.add(x));
    for (let n = 0; n <= 3; n++) for (const o of maakTel(n, 20, rnd)) nodig.add(o.n);
    for (const x of nodig) {
      expect(x).toBeLessThanOrEqual(MAX_GETAL);
      expect(lijst.has(`getal|${x}`)).toBe(true);
    }
    for (const w of ['plus', 'min', 'is']) expect(lijst.has(`getal|${w}`)).toBe(true);
  });
});
