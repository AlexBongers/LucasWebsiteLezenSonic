/**
 * Geluidseffecten en muziek, gemaakt met de Web Audio API (geen bestanden nodig).
 * Alles loopt via een compressor, zodat veel geluid tegelijk nooit gaat vervormen.
 * De muziek zakt automatisch weg als de stem praat (ducking).
 */
let ctx: AudioContext | null = null;
let effectenAan = true;
let effBus: GainNode | null = null;
let muziekBus: GainNode | null = null;

export function zetEffectenAan(aan: boolean) {
  effectenAan = aan;
}

/** Moet aangeroepen worden vanuit een tik (anders blokkeert de browser geluid). */
export function ontgrendelGeluid() {
  if (!ctx) {
    ctx = new AudioContext();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    compressor.connect(ctx.destination);
    effBus = ctx.createGain();
    effBus.gain.value = 0.62;
    effBus.connect(compressor);
    muziekBus = ctx.createGain();
    muziekBus.gain.value = 0.7;
    muziekBus.connect(compressor);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

/** De gedeelde AudioContext (pas beschikbaar na de eerste tik). */
export function audioContext(): AudioContext | null {
  return ctx;
}

// ---------------------------------------------------------------- Bouwstenen
function toon(freq: number, start: number, duur: number, type: OscillatorType = 'sine', volume = 0.18, naar?: AudioNode, glijdNaar?: number) {
  if (!ctx || !effBus) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glijdNaar) osc.frequency.exponentialRampToValueAtTime(glijdNaar, t0 + duur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duur);
  osc.connect(gain).connect(naar ?? effBus);
  osc.start(t0);
  osc.stop(t0 + duur + 0.05);
}

function ruis(duur: number, start: number, volume: number, filter: BiquadFilterType, van: number, naar: number, naarBus?: AudioNode) {
  if (!ctx || !effBus) return;
  const t0 = ctx.currentTime + start;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.6);
  const bron = ctx.createBufferSource();
  bron.buffer = buffer;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(van, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, naar), t0 + duur);
  const gain = ctx.createGain();
  gain.gain.value = volume;
  bron.connect(f).connect(gain).connect(naarBus ?? effBus);
  bron.start(t0);
}

const aan = () => !!ctx && effectenAan;

// ---------------------------------------------------------------- Effecten
/** Goed antwoord: vrolijk "ting-ting". */
export function speelGoed() {
  if (!aan()) return;
  toon(880, 0, 0.25, 'triangle', 0.16);
  toon(1320, 0.1, 0.35, 'triangle', 0.16);
  toon(1760, 0.2, 0.4, 'sine', 0.08);
}

/** Fout antwoord: zacht, niet streng. */
export function speelBijna() {
  if (!aan()) return;
  toon(330, 0, 0.18, 'sine', 0.12);
  toon(262, 0.12, 0.25, 'sine', 0.12);
}

/** Een gouden ring: het bekende dubbele "ting". */
export function speelRing() {
  if (!aan()) return;
  toon(1568, 0, 0.22, 'sine', 0.11);
  toon(2093, 0.06, 0.45, 'sine', 0.12);
  toon(3136, 0.06, 0.3, 'sine', 0.04);
}

/** Ontploffing: dreun, knal en brokstukken. */
export function speelBoem() {
  if (!aan()) return;
  toon(130, 0, 0.45, 'sine', 0.5, undefined, 38);
  ruis(0.55, 0, 0.55, 'lowpass', 3000, 180);
  ruis(0.08, 0, 0.35, 'highpass', 3500, 1800);
  ruis(0.4, 0.12, 0.12, 'bandpass', 1600, 400);
}

/** Oude naam, wordt nu een echte knal. */
export const speelPoef = speelBoem;

/** Katapult: de arm klapt naar voren. */
export function speelKatapult() {
  if (!aan()) return;
  toon(520, 0, 0.16, 'sawtooth', 0.12, undefined, 110);
  ruis(0.28, 0.02, 0.18, 'bandpass', 400, 2600);
}

/** Snelle beweging. */
export function speelWhoosh() {
  if (!aan()) return;
  ruis(0.3, 0, 0.16, 'bandpass', 300, 2600);
}

/** Ronde gewonnen: fanfare. */
export function speelFanfare() {
  if (!aan()) return;
  [523, 659, 784, 1047].forEach((f, i) => toon(f, i * 0.13, 0.4, 'triangle', 0.15));
  toon(1047, 0.6, 0.9, 'triangle', 0.13);
  toon(1319, 0.6, 0.9, 'sine', 0.09);
  toon(2093, 0.65, 0.8, 'sine', 0.05);
}

/** Level omhoog: een rennend loopje omhoog. */
export function speelLevelUp() {
  if (!aan()) return;
  [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => toon(f, i * 0.07, 0.3, 'square', 0.06));
  toon(2093, 0.5, 0.8, 'triangle', 0.1);
}

/** Een turbokristal: glinsterend belletje. */
export function speelKristal() {
  if (!aan()) return;
  [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => {
    toon(f, i * 0.09, 0.9, 'sine', 0.08);
    toon(f * 2, i * 0.09 + 0.04, 0.5, 'sine', 0.03);
  });
}

/** Tik op een knop. */
export function speelTik() {
  if (!aan()) return;
  toon(660, 0, 0.08, 'sine', 0.08);
}

/** Combo: snel oplopend loopje. */
export function speelCombo() {
  if (!aan()) return;
  [784, 988, 1175, 1568].forEach((f, i) => toon(f, i * 0.07, 0.22, 'square', 0.07));
}

// ---------------------------------------------------------------- Muziek
const BPM = 132;
const STAP = 60 / BPM / 2; // een achtste noot
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Acht maten in C-groot: C, G, Am, F, en dan een variatie. Een getal is een MIDI-noot, null is stilte. */
const MELODIE: (number | null)[][] = [
  [76, 79, 84, 79, 76, 79, 84, null],
  [74, 79, 83, 79, 74, 79, 83, null],
  [72, 76, 81, 76, 72, 76, 81, null],
  [72, 77, 81, 77, 72, 77, 84, 81],
  [79, 84, 88, 84, 79, 84, 88, null],
  [79, 83, 86, 83, 79, 83, 86, null],
  [81, 84, 88, 84, 81, 76, 72, null],
  [77, 81, 84, 81, 79, 83, 86, 83],
];
const BAS = [48, 43, 45, 41, 48, 43, 45, 43];

let muziekWens = false;
let muziekTimer: ReturnType<typeof setInterval> | null = null;
let volgendeStap = 0;
let stapNummer = 0;
let ducken = false;
let onduckTimer: ReturnType<typeof setTimeout> | null = null;

function speelStap(nr: number, t: number) {
  if (!ctx || !muziekBus) return;
  const maat = Math.floor(nr / 8) % MELODIE.length;
  const stap = nr % 8;
  const noot = MELODIE[maat][stap];
  const klink = (freq: number, duur: number, type: OscillatorType, vol: number, filter?: number) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + duur);
    let uit: AudioNode = gain;
    osc.connect(gain);
    if (filter) {
      const f = ctx!.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      gain.connect(f);
      uit = f;
    }
    uit.connect(muziekBus!);
    osc.start(t);
    osc.stop(t + duur + 0.05);
  };
  if (noot) klink(mtof(noot), STAP * 1.7, 'square', 0.03, 3200);
  if (stap % 2 === 0) klink(mtof(BAS[maat]), STAP * 1.8, 'triangle', 0.1);
  if (stap === 3 || stap === 7) klink(mtof(BAS[maat] + 7), STAP * 1.2, 'triangle', 0.05);
  // Slagwerk: trommel op 1 en 3, tik op 2 en 4, hi-hat op elke stap
  const k = (duur: number, volume: number, filter: BiquadFilterType, van: number, naar: number) => {
    const buffer = ctx!.createBuffer(1, Math.ceil(ctx!.sampleRate * duur), ctx!.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const bron = ctx!.createBufferSource();
    bron.buffer = buffer;
    const f = ctx!.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(van, t);
    f.frequency.exponentialRampToValueAtTime(naar, t + duur);
    const g = ctx!.createGain();
    g.gain.value = volume;
    bron.connect(f).connect(g).connect(muziekBus!);
    bron.start(t);
  };
  if (stap === 0 || stap === 4) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain).connect(muziekBus);
    osc.start(t);
    osc.stop(t + 0.16);
  }
  if (stap === 2 || stap === 6) k(0.1, 0.05, 'bandpass', 2400, 1200);
  k(0.03, stap % 2 ? 0.012 : 0.02, 'highpass', 7000, 6000);
}

function planStappen() {
  if (!ctx) return;
  // Een eventueel gemiste periode (tabblad op de achtergrond) niet inhalen.
  if (volgendeStap < ctx.currentTime) volgendeStap = ctx.currentTime + 0.05;
  while (volgendeStap < ctx.currentTime + 0.35) {
    speelStap(stapNummer, volgendeStap);
    volgendeStap += STAP;
    stapNummer++;
  }
}

/** Start de achtergrondmuziek (zacht, zakt weg als de stem praat). */
export function startMuziek() {
  muziekWens = true;
  if (!ctx || !muziekBus || muziekTimer) return;
  volgendeStap = ctx.currentTime + 0.1;
  muziekBus.gain.value = ducken ? 0.18 : 0.7;
  muziekTimer = setInterval(planStappen, 90);
}

export function stopMuziek() {
  muziekWens = false;
  if (muziekTimer) {
    clearInterval(muziekTimer);
    muziekTimer = null;
  }
}

export function zetMuziekAan(aanOf: boolean) {
  if (aanOf) startMuziek();
  else stopMuziek();
}

export const muziekGewenst = () => muziekWens;

/** De muziek zachter terwijl de stem praat; daarna rustig weer harder. */
export function duckMuziek(zacht: boolean) {
  if (!ctx || !muziekBus) return;
  if (zacht) {
    if (onduckTimer) clearTimeout(onduckTimer);
    onduckTimer = null;
    ducken = true;
    muziekBus.gain.setTargetAtTime(0.16, ctx.currentTime, 0.06);
  } else {
    if (onduckTimer) clearTimeout(onduckTimer);
    // Even wachten: er komt vaak meteen een volgende zin.
    onduckTimer = setTimeout(() => {
      ducken = false;
      if (ctx && muziekBus) muziekBus.gain.setTargetAtTime(0.7, ctx.currentTime, 0.4);
    }, 500);
  }
}

/** Alles pauzeren als de app naar de achtergrond gaat (en weer verder). */
export function pauzeerGeluid(pauze: boolean) {
  if (!ctx) return;
  if (pauze) void ctx.suspend();
  else void ctx.resume();
}
