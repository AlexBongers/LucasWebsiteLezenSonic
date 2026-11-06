import { describe, expect, it } from 'vitest';
import { aanDeBeurt, verwerkAntwoord, type Herhaling } from '../src/engine/herhaling';
import { auditieUitslag, planAuditie, planSessie, verdeling } from '../src/engine/sessie';
import { maakSommen, somId, somUitId, maakKent, STANDAARD_KENT } from '../src/engine/generator-lucas';
import { auditieNiveaus, SPELLEN } from '../src/games/spellen';
import { werkStatsBij, lastigsteSommen, vaakVerwisseld, type Stats } from '../src/engine/overzicht';
import { zaadRnd } from '../src/engine/toeval';

const DAG = 864e5;

describe('herhalingsdoosjes', () => {
  it('fout gaat naar doos 1 en komt meteen weer aan de beurt', () => {
    const h = verwerkAntwoord({}, 'som.4+3', false, 1, 1000);
    expect(h['som.4+3']).toEqual({ doos: 1, volgende: 1000, niveau: 1 });
    expect(aanDeBeurt(h, 'som.', 1000)).toEqual([{ id: 'som.4+3', niveau: 1 }]);
  });
  it('goed schuift een doos op en wacht steeds langer; na doos 5 is het gekend', () => {
    let h: Herhaling = verwerkAntwoord({}, 'ring.b', false, 1, 0);
    h = verwerkAntwoord(h, 'ring.b', true, 1, 0);
    expect(h['ring.b'].doos).toBe(2);
    expect(h['ring.b'].volgende).toBe(1 * DAG);
    for (let i = 0; i < 3; i++) h = verwerkAntwoord(h, 'ring.b', true, 1, 0);
    expect(h['ring.b'].doos).toBe(5);
    h = verwerkAntwoord(h, 'ring.b', true, 1, 0);
    expect(h['ring.b']).toBeUndefined();
  });
  it('de voorvoegsels houden de spellen uit elkaar', () => {
    let h: Herhaling = verwerkAntwoord({}, 'ring.b', false, 0, 0);
    h = verwerkAntwoord(h, 'woord.kat', false, 0, 0);
    expect(aanDeBeurt(h, 'ring.', 0).map((x) => x.id)).toEqual(['ring.b']);
    expect(aanDeBeurt(h, 'woord.', 0).map((x) => x.id)).toEqual(['woord.kat']);
  });
});

describe('ronde plannen', () => {
  it('geen uitdaging, wel makkelijke opwarmer; nooit moeilijker dan zijn niveau', () => {
    const rnd = zaadRnd(3);
    const plan = planSessie({
      aantal: 6,
      niveau: 2,
      maxNiveau: 4,
      herhaling: [],
      maak: (n, aantal) => maakSommen(n, aantal, rnd),
      herbouw: (id) => somUitId(id, rnd),
      id: somId,
      uitdaging: false,
      makkelijk: 0.3,
      rnd,
    });
    expect(plan).toHaveLength(6);
    expect(plan[0].bron).toBe('makkelijk');
    expect(Math.max(...plan.map((p) => p.niveau))).toBeLessThanOrEqual(2);
    expect(new Set(plan.map((p) => p.id)).size).toBe(6);
  });
  it('verdeling met een tiental makkelijke opgaven', () => {
    expect(verdeling(10, true, false, 0, 0.3)).toEqual({ niveau: 7, makkelijk: 3, uitdaging: 0, herhaling: 0 });
  });
  it('neemt opgaven uit de doosjes mee', () => {
    const rnd = zaadRnd(4);
    const plan = planSessie({
      aantal: 8,
      niveau: 1,
      maxNiveau: 4,
      herhaling: [{ id: 'som.4+5', niveau: 1 }, { id: 'som.3+4', niveau: 1 }],
      maak: (n, aantal) => maakSommen(n, aantal, rnd),
      herbouw: (id) => somUitId(id, rnd),
      id: somId,
      uitdaging: false,
      rnd,
    });
    expect(plan.filter((p) => p.bron === 'herhaling').map((p) => p.id).sort()).toEqual(['som.3+4', 'som.4+5']);
  });
});

describe('auditie', () => {
  it('elk spel krijgt 8 opgaven die oplopen', () => {
    for (const sp of SPELLEN) {
      const n = auditieNiveaus(sp.maxNiveau);
      expect(n).toHaveLength(8);
      expect([...n].sort((a, b) => a - b)).toEqual(n);
      expect(Math.max(...n)).toBeLessThanOrEqual(sp.maxNiveau);
    }
  });
  it('planAuditie maakt per niveau het juiste aantal', () => {
    const plan = planAuditie(auditieNiveaus(4), (n, aantal) => maakSommen(n, aantal), somId);
    expect(plan).toHaveLength(8);
    expect(plan.every((p) => p.bron === 'auditie')).toBe(true);
  });
  const r = (niveau: number, goed: boolean) => ({ niveau, goed });
  it('begint op het eerste niveau dat niet lukt; rekenen is strenger', () => {
    expect(auditieUitslag([r(0, true), r(0, true), r(1, true), r(1, false)], 4, 1)).toBe(1);
    expect(auditieUitslag([r(0, true), r(0, true), r(1, true), r(1, false), r(1, true)], 4)).toBe(4);
    expect(auditieUitslag([r(0, true), r(0, false), r(1, true), r(1, true)], 4)).toBe(0);
  });
});

describe('overzicht', () => {
  it('telt per soort som en onthoudt verwisselde letters', () => {
    let stats: Stats = { sommen: {}, verwisselingen: {} };
    stats = werkStatsBij(stats, [
      { id: 'som.4+3', niveau: 1, bron: 'niveau', goed: false },
      { id: 'som.2+2', niveau: 0, bron: 'niveau', goed: true },
      { id: 'ring.b', niveau: 1, bron: 'niveau', goed: false, gekozen: 'd' },
      { id: 'smash.bal', niveau: 1, bron: 'niveau', goed: false, gekozen: 'd' },
      { id: 'ring.m', niveau: 0, bron: 'niveau', goed: true },
    ]);
    expect(stats.sommen['plus tot 10']).toEqual({ goed: 0, totaal: 1 });
    expect(lastigsteSommen(stats, 1)[0].soort).toBe('plus tot 10');
    expect(vaakVerwisseld(stats)).toEqual([{ letter: 'b', gekozen: 'd', keer: 2 }]);
  });
  it('standaardletters zijn een kent-set', () => {
    expect(maakKent(STANDAARD_KENT).has('m')).toBe(true);
  });
});

describe('auditie zonder dubbele opgaven', () => {
  it('geen enkele som twee keer, ook niet op verschillende niveaus', () => {
    for (let zaad = 1; zaad < 25; zaad++) {
      const rnd = zaadRnd(zaad);
      const plan = planAuditie(auditieNiveaus(4), (n, aantal) => maakSommen(n, aantal, rnd), somId);
      expect(plan).toHaveLength(8);
      expect(new Set(plan.map((p) => p.id)).size).toBe(8);
    }
  });
});
