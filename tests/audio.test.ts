import { describe, expect, it } from 'vitest';
import { begrens, DOEL_LUFS, gelijkTrekken, luidheid, MAX_PIEK, maakWav, naarMp3, piek, SAMPLERATE, trimEnFade } from '../tools/audio/dsp';
import { gelijkenis, isGoed, normaliseerTekst } from '../tools/audio/controle';

const sinus = (hz: number, amplitude: number, seconden: number, fs = SAMPLERATE) =>
  Float32Array.from({ length: Math.floor(fs * seconden) }, (_, i) => amplitude * Math.sin((2 * Math.PI * hz * i) / fs));

describe('luidheid (LUFS)', () => {
  it('een sinus van 1 kHz met amplitude 0,1 is ongeveer -23 LUFS', () => {
    expect(luidheid(sinus(1000, 0.1, 2))).toBeCloseTo(-23, 0);
  });
  it('twee keer zo luid is 6 dB meer', () => {
    expect(luidheid(sinus(1000, 0.2, 2)) - luidheid(sinus(1000, 0.1, 2))).toBeCloseTo(6.02, 1);
  });
  it('werkt ook bij korte fragmenten (korter dan 0,4 s)', () => {
    expect(luidheid(sinus(1000, 0.1, 0.25))).toBeCloseTo(-23, 0);
  });
  it('stilte heeft geen luidheid', () => {
    expect(luidheid(new Float32Array(SAMPLERATE))).toBe(-Infinity);
  });
});

describe('gelijk trekken', () => {
  it('zachte en harde opnames komen op dezelfde luidheid', () => {
    for (const a of [0.01, 0.05, 0.2]) {
      const { samples, wordt } = gelijkTrekken(sinus(500, a, 1));
      expect(wordt).toBeCloseTo(DOEL_LUFS, 0);
      expect(piek(samples)).toBeLessThanOrEqual(MAX_PIEK + 1e-6);
    }
  });
  it('de begrenzer laat zachte stukken ongemoeid en houdt pieken onder de grens', () => {
    const uit = begrens(Float32Array.from([0.1, -0.5, 0.9, -2, 5]));
    expect(uit[0]).toBeCloseTo(0.1, 6);
    expect(uit[1]).toBeCloseTo(-0.5, 6);
    expect(Math.max(...Array.from(uit).map(Math.abs))).toBeLessThanOrEqual(MAX_PIEK);
  });
});

describe('knippen en opslaan', () => {
  it('knipt stilte weg maar houdt het geluid', () => {
    const stil = new Float32Array(SAMPLERATE);
    const x = new Float32Array([...stil, ...sinus(300, 0.3, 0.3), ...stil]);
    const uit = trimEnFade(x);
    expect(uit.length).toBeLessThan(SAMPLERATE * 0.6);
    expect(uit.length).toBeGreaterThan(SAMPLERATE * 0.3);
    expect(Math.abs(uit[0])).toBeLessThan(0.01);
  });
  it('maakt een wav en een mp3', () => {
    const wav = maakWav(sinus(300, 0.3, 0.5));
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.length).toBe(44 + SAMPLERATE * 0.5 * 2);
    const mp3 = naarMp3(sinus(300, 0.3, 0.5));
    expect(mp3.length).toBeGreaterThan(1000);
    // mp3-frames beginnen met een synchronisatiebyte
    expect(mp3[0]).toBe(0xff);
  });
});

describe('uitspraakcontrole', () => {
  it('normaliseert getallen en leestekens', () => {
    expect(normaliseerTekst('Zeven!')).toBe('zeven');
    expect(normaliseerTekst('Het is 20.')).toBe('het is twintig');
    expect(normaliseerTekst('één')).toBe('een');
  });
  it('korte woorden moeten precies kloppen, spaties tellen niet', () => {
    expect(isGoed('zevenenveertig', 'Zeven en veertig.')).toBe(true);
    expect(isGoed('kat', 'Kom.')).toBe(false);
    expect(isGoed('hoed', 'Goed')).toBe(false);
    expect(isGoed('twintig', '20')).toBe(true);
  });
  it('langere zinnen mogen een kleine afwijking hebben', () => {
    expect(isGoed('Hoi Lucas! Kies je held!', 'Hoi Lucas kies je held')).toBe(true);
    expect(isGoed('Hoi Lucas! Kies je held!', 'Hoi Lucas kies je')).toBe(false);
    expect(gelijkenis('maan', 'maan')).toBe(1);
  });
});
