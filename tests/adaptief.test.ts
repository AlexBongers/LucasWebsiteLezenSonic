import { describe, expect, it } from 'vitest';
import { percentage, REKEN_REGELS, verwerkSessie } from '../src/engine/adaptief';
import { audioSleutel, cyrb53 } from '../src/audio/hash';

const reeks = (goed: number, totaal: number) => Array.from({ length: totaal }, (_, i) => i < goed);

describe('niveau-aanpassing', () => {
  it('gaat omhoog boven 85%', () => {
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(8, 8), 2).niveau).toBe(2);
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(7, 8), 2).niveau).toBe(2);
  });
  it('blijft tussen 60% en 85%', () => {
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(6, 8), 2).niveau).toBe(1);
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(5, 8), 2).niveau).toBe(1);
  });
  it('gaat omlaag onder 60%', () => {
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(4, 8), 2).niveau).toBe(0);
  });
  it('blijft binnen de grenzen', () => {
    expect(verwerkSessie({ niveau: 2, recent: [] }, reeks(8, 8), 2).niveau).toBe(2);
    expect(verwerkSessie({ niveau: 0, recent: [] }, reeks(0, 8), 2).niveau).toBe(0);
  });
  it('verandert niets bij te weinig opgaven', () => {
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(3, 3), 2).niveau).toBe(1);
  });
  it('telt over rondes heen tot er 8 opgaven zijn', () => {
    const na1 = verwerkSessie({ niveau: 1, recent: [] }, reeks(4, 4), 2);
    expect(na1.niveau).toBe(1);
    expect(na1.opNiveau).toHaveLength(4);
    const na2 = verwerkSessie(na1, reeks(4, 4), 2);
    expect(na2.niveau).toBe(2);
    expect(na2.opNiveau).toEqual([]);
  });
  it('kijkt naar de laatste 10 en begint opnieuw na een wissel', () => {
    let v = verwerkSessie({ niveau: 1, recent: [] }, reeks(6, 8), 2); // 75%: blijven
    expect(v.niveau).toBe(1);
    v = verwerkSessie(v, reeks(4, 4), 2); // laatste 10: 8 goed = 80%, blijven
    expect(v.niveau).toBe(1);
    expect(v.opNiveau).toHaveLength(10);
    v = verwerkSessie(v, reeks(5, 5), 2); // laatste 10: 9 goed = 90%, omhoog
    expect(v.niveau).toBe(2);
  });
  it('rekenen: pas omhoog bij 9 van de 10, al omlaag onder 70%', () => {
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(8, 8), 4, REKEN_REGELS).niveau).toBe(1); // nog maar 8
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(8, 10), 4, REKEN_REGELS).niveau).toBe(1); // 80%: blijven
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(9, 10), 4, REKEN_REGELS).niveau).toBe(2); // 90%: omhoog
    expect(verwerkSessie({ niveau: 1, recent: [] }, reeks(6, 10), 4, REKEN_REGELS).niveau).toBe(0); // 60%: omlaag
  });
  it('onthoudt maximaal 20 antwoorden', () => {
    const v = verwerkSessie({ niveau: 0, recent: reeks(15, 15) }, reeks(0, 10), 2);
    expect(v.recent).toHaveLength(20);
    expect(percentage(v)).toBe(50);
  });
});

describe('audio-sleutels', () => {
  it('zijn stabiel en hangen af van tekst, soort en stem', () => {
    expect(cyrb53('hallo')).toBe(cyrb53('hallo'));
    expect(audioSleutel('maan', 'woord', 'x')).toBe(audioSleutel('  maan ', 'woord', 'x'));
    expect(audioSleutel('maan', 'woord', 'x')).not.toBe(audioSleutel('maan', 'zin', 'x'));
    expect(audioSleutel('maan', 'woord', 'x')).not.toBe(audioSleutel('maan', 'woord', 'y'));
  });
});
