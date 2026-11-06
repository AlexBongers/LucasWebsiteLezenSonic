/**
 * Geluidseffecten, gemaakt met de Web Audio API (geen bestanden nodig).
 */
let ctx: AudioContext | null = null;
let muziekAan = true;

export function zetEffectenAan(aan: boolean) {
  muziekAan = aan;
}

/** Moet aangeroepen worden vanuit een tik (anders blokkeert de browser geluid). */
export function ontgrendelGeluid() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

/** De gedeelde AudioContext (pas beschikbaar na de eerste tik). */
export function audioContext(): AudioContext | null {
  return ctx;
}

function toon(freq: number, start: number, duur: number, type: OscillatorType = 'sine', volume = 0.18) {
  if (!ctx || !muziekAan) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duur + 0.05);
}

/** Goed antwoord: vrolijk "ting-ting". */
export function speelGoed() {
  toon(880, 0, 0.25, 'triangle');
  toon(1320, 0.1, 0.35, 'triangle');
}

/** Fout antwoord: zacht, niet streng. */
export function speelBijna() {
  toon(330, 0, 0.18, 'sine', 0.12);
  toon(262, 0.12, 0.25, 'sine', 0.12);
}

/** Robot ontploft: "poef". */
export function speelPoef() {
  if (!ctx || !muziekAan) return;
  const duur = 0.35;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duur, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const bron = ctx.createBufferSource();
  bron.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + duur);
  const gain = ctx.createGain();
  gain.gain.value = 0.25;
  bron.connect(filter).connect(gain).connect(ctx.destination);
  bron.start();
}

/** Ronde gewonnen: fanfare. */
export function speelFanfare() {
  [523, 659, 784, 1047].forEach((f, i) => toon(f, i * 0.13, 0.4, 'triangle', 0.16));
  toon(1047, 0.6, 0.9, 'triangle', 0.14);
  toon(1319, 0.6, 0.9, 'sine', 0.1);
}

/** Tik op een knop. */
export function speelTik() {
  toon(660, 0, 0.08, 'sine', 0.08);
}

/** Combo: snel oplopend loopje. */
export function speelCombo() {
  [784, 988, 1175, 1568].forEach((f, i) => toon(f, i * 0.07, 0.22, 'square', 0.07));
}
