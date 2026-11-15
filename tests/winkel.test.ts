import { beforeEach, describe, expect, it } from 'vitest';
import { zaadRnd } from '../src/engine/toeval';
import { maakKent } from '../src/engine/generator-lucas';
import { ARTIKELEN, MAX_VOORRAAD, artikelenVan, SOORTEN } from '../src/games/winkel';
import { koop, pakPowerup, verdien, wissel, heeft, voorraad } from '../src/store/winkel.svelte';
import { standaardVoortgang, vg } from '../src/store/voortgang.svelte';
import { Ronde } from '../src/games/ronde.svelte';
import { meldHartGebruikt, nieuweRonde, uitrusting } from '../src/games/uitrusting.svelte';
import teksten from '../content/teksten.json';

beforeEach(() => {
  Object.assign(vg, standaardVoortgang());
  uitrusting.hart = 0;
  nieuweRonde();
});

describe('de Turbo-winkel', () => {
  it('elk artikel heeft een naam en uitleg die de stem kan uitspreken, en elke powerup ook een aan-zin', () => {
    const t = teksten.winkel.artikelen as Record<string, { naam: string; uitleg: string; aan?: string }>;
    for (const a of ARTIKELEN) {
      expect(t[a.id]?.naam, a.id).toBeTruthy();
      expect(t[a.id]?.uitleg, a.id).toBeTruthy();
      if (a.soort === 'power') expect(t[a.id].aan, a.id).toBeTruthy();
      expect(a.prijs).toBeGreaterThan(0);
    }
    for (const s of SOORTEN) expect(artikelenVan(s.soort).length).toBeGreaterThan(0);
  });

  it('alles kost gouden ringen, en de stem kan elke prijs uitspreken', async () => {
    const { SPAAR_GETALLEN } = await import('../src/audio/alle-teksten');
    const { KLEDING } = await import('../src/games/kleding');
    for (const p of [...ARTIKELEN, ...KLEDING].map((x) => x.prijs)) expect(SPAAR_GETALLEN).toContain(p);
    verdien(30);
    expect(vg.ringen).toBe(30);
  });

  it('oude bliksems worden omgezet in ringen (1 bliksem = 8 ringen)', async () => {
    const { importeer } = await import('../src/store/voortgang.svelte');
    const oud = { ...JSON.parse(JSON.stringify(standaardVoortgang())), ringen: 100, bliksems: 5 } as Record<string, unknown>;
    delete oud.munt;
    await importeer(JSON.stringify(oud));
    expect(vg.ringen).toBe(140);
    expect(vg.bliksems).toBe(0);
  });

  it('een powerup kopen kost ringen en komt in de voorraad; te weinig ringen kan niet', () => {
    expect(koop('hart')).toBe('te-weinig');
    expect(voorraad('hart')).toBe(0);
    verdien(30);
    expect(koop('hart')).toBe('gekocht');
    expect(vg.ringen).toBe(5);
    expect(voorraad('hart')).toBe(1);
    expect(pakPowerup('hart')).toBe(true);
    expect(pakPowerup('hart')).toBe(false);
  });

  it('de voorraad van een powerup is begrensd', () => {
    verdien(1000);
    for (let i = 0; i < MAX_VOORRAAD; i++) expect(koop('hart')).toBe('gekocht');
    expect(koop('hart')).toBe('vol');
    expect(vg.ringen).toBe(1000 - MAX_VOORRAAD * 25);
  });

  it('een maatje koop je één keer, staat meteen aan en kun je aan- en uitzetten', () => {
    verdien(240);
    expect(koop('vos')).toBe('gekocht');
    expect(heeft('vos')).toBe(true);
    expect(vg.winkel.gekozen.maatje).toBe('vos');
    expect(koop('vos')).toBe('al-van-hem');
    expect(vg.ringen).toBe(160);
    expect(wissel('vos')).toBe(false);
    expect(vg.winkel.gekozen.maatje).toBe('');
    expect(wissel('vos')).toBe(true);
    // Eén maatje tegelijk
    expect(koop('kuiken')).toBe('gekocht');
    expect(vg.winkel.gekozen.maatje).toBe('kuiken');
  });

  it('oude voortgang zonder winkel krijgt een lege winkel', async () => {
    const { importeer } = await import('../src/store/voortgang.svelte');
    const oud = JSON.parse(JSON.stringify(standaardVoortgang())) as Record<string, unknown>;
    delete oud.winkel;
    delete oud.bliksems;
    await importeer(JSON.stringify(oud));
    expect(vg.winkel.bezit).toEqual([]);
    expect(vg.winkel.gekozen.ring).toBe('');
  });
});

describe('extra leven', () => {
  const opgaven = [1, 2].map((n) => ({ id: `x${n}`, niveau: 0, bron: 'nieuw' as const, opgave: n }));
  const props = { opKlaar: () => {}, opVoortgang: () => {} };

  it('een fout kost geen ringen als er een extra leven actief is, maar telt wel mee voor het leren', () => {
    uitrusting.hart = 1;
    const r = new Ronde(opgaven as never, props);
    expect(r.fout('a')).toBe('hint');
    expect(uitrusting.hart).toBe(0);
    expect(r.goed()).toBe(2);
  });

  it('zonder extra leven kost de fout een ring', () => {
    const r = new Ronde(opgaven as never, props);
    r.fout('a');
    expect(r.goed()).toBe(1);
  });

  it('het extra leven beschermt maar één fout, en alleen de eerste van een opgave', () => {
    uitrusting.hart = 1;
    const r = new Ronde(opgaven as never, props);
    r.fout('a');
    expect(r.fout('b')).toBe('onthuld');
    expect(uitrusting.hart).toBe(0);
  });

  it('de volgende "bijna"-zin vertelt dat het extra leven hielp', async () => {
    const { bijna } = await import('../src/games/teksten');
    meldHartGebruikt();
    expect(teksten.winkel.hartGebruikt).toContain(bijna());
  });
});

describe('de nieuwe 3D-spellen', () => {
  const kent = maakKent(['m', 'r', 'v', 's', 'a', 'i', 'e', 'o', 'k', 'p', 't', 'n']);

  it('patroonbaan: id-rondreis, antwoord zit bij de keuzes', async () => {
    const { SPEL } = await import('../src/games/spellen');
    const def = SPEL.patroonbaan;
    for (let n = 0; n <= def.maxNiveau; n++) {
      for (const o of def.opgaven.maak(n, 8, kent, zaadRnd(3 + n)) as { antwoord: string; keuzes: string[]; reeks: string[] }[]) {
        const sleutel = def.opgaven.id(o as never);
        expect(sleutel.startsWith('pbaan.')).toBe(true);
        expect(def.opgaven.herbouw(sleutel, n, kent)).not.toBeNull();
        expect(o.keuzes).toContain(o.antwoord);
        expect(o.keuzes.length).toBe(3);
      }
    }
  });

  it('bouwmuur: id-rondreis, alle delen van het woord zitten bij de blokken', async () => {
    const { SPEL } = await import('../src/games/spellen');
    const def = SPEL.bouwmuur;
    for (let n = 0; n <= def.maxNiveau; n++) {
      for (const o of def.opgaven.maak(n, 8, kent, zaadRnd(7 + n)) as { delen: string[]; tegels: string[] }[]) {
        const sleutel = def.opgaven.id(o as never);
        expect(sleutel.startsWith('muur.')).toBe(true);
        expect(def.opgaven.herbouw(sleutel, n, kent)).not.toBeNull();
        for (const d of o.delen) expect(o.tegels).toContain(d);
      }
    }
  });

  it('bomsplits: id-rondreis, het antwoord zit bij de keuzes en a + b = totaal', async () => {
    const { SPEL } = await import('../src/games/spellen');
    const def = SPEL.bomsplits;
    for (let n = 0; n <= def.maxNiveau; n++) {
      for (const o of def.opgaven.maak(n, 8, kent, zaadRnd(11 + n)) as { a: number; b: number; totaal: number; keuzes: number[] }[]) {
        const sleutel = def.opgaven.id(o as never);
        expect(sleutel.startsWith('bsplits.')).toBe(true);
        expect(def.opgaven.herbouw(sleutel, n, kent)).not.toBeNull();
        expect(o.a + o.b).toBe(o.totaal);
        expect(o.keuzes).toContain(o.b);
        expect(o.keuzes.length).toBe(3);
      }
    }
  });
});

describe('het plakboek', () => {
  it('elke sticker is een woordje met plaatje (en dus met stem), en elk woordje staat op precies één bladzijde', async () => {
    const { ALLE_WOORDEN } = await import('../src/engine/generator-lucas');
    const { ALLE_STICKERS, BLADZIJDEN } = await import('../src/games/stickers');
    const woorden = ALLE_WOORDEN.map((w) => w.woord).sort();
    expect([...ALLE_STICKERS].sort()).toEqual(woorden);
    for (const b of BLADZIJDEN) {
      expect((teksten.plakboek.bladzijden as Record<string, string>)[b.soort]).toBeTruthy();
      expect(b.woorden.length).toBeLessThanOrEqual(21);
    }
  });

  it('een sticker verdienen: eerst vooral nieuwe, een dubbele levert ringen op', async () => {
    const { geefSticker, aantalVerzameld } = await import('../src/store/plakboek.svelte');
    const rnd = zaadRnd(4);
    for (let i = 0; i < 30; i++) geefSticker({ rnd });
    expect(aantalVerzameld()).toBeGreaterThan(18);
    const dubbele = Object.values(vg.plakboek.stickers).reduce((a, n) => a + n, 0) - aantalVerzameld();
    expect(vg.ringen).toBeGreaterThanOrEqual((dubbele - vg.plakboek.glim.length) * 5);
  });

  it('een volle bladzijde geeft 40 ringen extra, één keer', async () => {
    const { geefSticker } = await import('../src/store/plakboek.svelte');
    const { BLADZIJDEN } = await import('../src/games/stickers');
    const dieren = BLADZIJDEN[0].woorden;
    for (const w of dieren.slice(1)) vg.plakboek.stickers[w] = 1;
    // Alles behalve de eerste: de volgende nieuwe sticker die past maakt de bladzijde vol
    let winst = geefSticker({ rnd: () => 0, glim: false });
    while (winst.woord !== dieren[0]) winst = geefSticker({ rnd: () => 0, glim: false });
    expect(winst.bladzijdeVol).toBe('dieren');
    expect(vg.plakboek.vol).toEqual(['dieren']);
  });

  it('een stickerzakje uit de winkel heeft drie stickers, een glimzakje één glimmer', async () => {
    const { openZakje } = await import('../src/store/plakboek.svelte');
    expect(openZakje('zakje').length).toBe(3);
    const glim = openZakje('glimzakje');
    expect(glim.length).toBe(2);
    expect(glim[0].glim).toBe(true);
    vg.ringen = 70;
    expect(koop('zakje')).toBe('gekocht');
    expect(koop('zakje')).toBe('te-weinig');
  });
});

describe('de 3D-versies van Meer-race, Woord-race en Letter-jacht', () => {
  const kent = maakKent(['m', 'r', 'v', 's', 'a', 'i', 'e', 'o', 'k', 'p', 't', 'n']);
  for (const [id, voorvoegsel] of [['meer3d', 'meer3.'], ['woordrace3d', 'wrace3.'], ['jacht3d', 'jacht3.']] as const) {
    it(`${id}: elke opgave is uit zijn id te herbouwen`, async () => {
      const { SPEL } = await import('../src/games/spellen');
      const def = SPEL[id];
      for (let n = 0; n <= def.maxNiveau; n++) {
        const lijst = def.opgaven.maak(n, 6, kent, zaadRnd(20 + n));
        expect(lijst.length).toBeGreaterThan(0);
        for (const o of lijst) {
          const sleutel = def.opgaven.id(o);
          expect(sleutel.startsWith(voorvoegsel)).toBe(true);
          expect(def.opgaven.herbouw(sleutel, n, kent)).not.toBeNull();
        }
      }
    });
  }
});

describe('de kleedkamer', () => {
  it('elk kledingstuk heeft een naam voor de stem', async () => {
    const { KLEDING, PLEKKEN } = await import('../src/games/kleding');
    for (const k of KLEDING) expect((teksten.kleedkamer.stuks as Record<string, string>)[k.id], k.id).toBeTruthy();
    for (const p of PLEKKEN) expect((teksten.kleedkamer.plekken as Record<string, string>)[p.plek]).toBeTruthy();
  });

  it('kopen trekt het meteen aan; daarna past het ook op een andere held', async () => {
    const { koopKleding, wisselKleding } = await import('../src/store/kleedkamer.svelte');
    expect(koopKleding('kroon', 'sonic')).toBe('te-weinig');
    vg.ringen = 120;
    expect(koopKleding('kroon', 'sonic')).toBe('gekocht');
    expect(vg.ringen).toBe(20);
    expect(vg.winkel.kleding.sonic.hoofd).toBe('kroon');
    expect(koopKleding('kroon', 'tails')).toBe('al-van-hem');
    expect(wisselKleding('kroon', 'tails')).toBe(true);
    expect(vg.winkel.kleding.tails.hoofd).toBe('kroon');
    expect(wisselKleding('kroon', 'sonic')).toBe(false);
    expect(vg.winkel.kleding.sonic.hoofd).toBe('');
  });
});

describe('Kluis-kraker (groep 3)', () => {
  it('het gat zit op de goede plek, het antwoord zit bij drie verschillende keuzes, en de id is te herbouwen', async () => {
    const { maakKluis, kluisId, kluisUitId, KORTE_KLINKERS } = await import('../src/engine/kluis');
    const kent = maakKent(['m', 'r', 'v', 's', 'a', 'i', 'e', 'o', 'k', 'p', 't', 'n']);
    for (let n = 0; n <= 1; n++) {
      const lijst = maakKluis(n, 10, kent, zaadRnd(30 + n));
      expect(lijst.length).toBeGreaterThan(4);
      for (const o of lijst) {
        expect(o.delen[o.gat]).toBe(o.antwoord);
        expect(o.keuzes).toContain(o.antwoord);
        expect(new Set(o.keuzes).size).toBe(3);
        if (n === 0) {
          expect(o.gat).toBe(1);
          expect(KORTE_KLINKERS).toContain(o.antwoord);
        }
        expect(kluisUitId(kluisId(o), n)?.antwoord).toBe(o.antwoord);
      }
    }
  });

  it('staat als groep 3-spel in de lijst en doet niet mee in de dagmissie', async () => {
    const { SPEL } = await import('../src/games/spellen');
    expect(SPEL.kluis.groep3).toBe(true);
  });
});

describe('Rijm-raket en Getallenbaan', () => {
  it('rijmparen rijmen echt (één lettergreep, zelfde eind) en het rijmwoord zit bij de drie keuzes', async () => {
    const { maakRijm, rijmId, rijmUitId, rijmDeel } = await import('../src/engine/rijm');
    const { ALLE_WOORDEN } = await import('../src/engine/generator-lucas');
    const info = (w: string) => ALLE_WOORDEN.find((x) => x.woord === w)!;
    for (let n = 0; n <= 1; n++) {
      for (const o of maakRijm(n, 12, zaadRnd(40 + n))) {
        expect(rijmDeel(info(o.woord))).toBe(rijmDeel(info(o.rijm)));
        expect(o.keuzes.map((k) => k.woord)).toContain(o.rijm);
        expect(o.keuzes.length).toBe(3);
        expect(o.keuzes.filter((k) => rijmDeel(info(k.woord)) === rijmDeel(info(o.woord))).length).toBe(1);
        expect(rijmUitId(rijmId(o), n)?.rijm).toBe(o.rijm);
      }
    }
  });

  it('getallenbaan: het antwoord past in de rij, zit bij de keuzes en blijft tot 20', async () => {
    const { maakBaan, baanId, baanUitId } = await import('../src/engine/getallenlijn');
    for (let n = 0; n <= 2; n++) {
      for (const o of maakBaan(n, 15, zaadRnd(50 + n))) {
        const stap = o.rij[1] - o.rij[0];
        o.rij.forEach((x, i) => i && expect(x - o.rij[i - 1]).toBe(stap));
        expect(o.antwoord).toBe(o.rij[o.gat]);
        expect(o.keuzes).toContain(o.antwoord);
        expect(new Set(o.keuzes).size).toBe(3);
        expect(Math.max(...o.rij)).toBeLessThanOrEqual(n === 0 ? 10 : 20);
        expect(baanUitId(baanId(o))?.antwoord).toBe(o.antwoord);
      }
    }
  });
});

describe('samenhang van de spellenlijst', () => {
  it('elk spel heeft voor elk niveau een uitleg in de ouderhoek', async () => {
    const { SPELLEN } = await import('../src/games/spellen');
    const { NIVEAUS } = await import('../src/games/niveaus');
    for (const s of SPELLEN) expect(NIVEAUS[s.id]?.length, s.id).toBe(s.maxNiveau + 1);
  });

  it('de lijst met 3D-spellen klopt met de namen (die eindigen op "3D")', async () => {
    const { SPELLEN, DRIE_D_SPELLEN } = await import('../src/games/spellen');
    const opNaam = SPELLEN.filter((s) => s.naam.endsWith('3D')).map((s) => s.id).sort();
    expect([...DRIE_D_SPELLEN].sort()).toEqual(opNaam);
  });

  it('elk spel heeft een eigen voorvoegsel voor de herhalingsdoosjes', async () => {
    const { SPELLEN } = await import('../src/games/spellen');
    const prefixen = SPELLEN.map((s) => s.prefix);
    expect(new Set(prefixen).size).toBe(prefixen.length);
  });

  it('elke 2D-tweeling verwijst naar een bestaand 3D-spel', async () => {
    const { SPEL, VERVANGEN_DOOR_3D, DRIE_D_SPELLEN } = await import('../src/games/spellen');
    for (const [twee, drie] of Object.entries(VERVANGEN_DOOR_3D)) {
      expect(SPEL[twee as keyof typeof SPEL]).toBeTruthy();
      expect(DRIE_D_SPELLEN).toContain(drie);
    }
  });
});
