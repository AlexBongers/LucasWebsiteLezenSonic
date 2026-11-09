/**
 * Geluidsbewerking in pure JavaScript (geen ffmpeg nodig):
 * stilte wegknippen, luidheid meten volgens EBU R128 / ITU BS.1770 (LUFS), alle opnames op dezelfde
 * luidheid zetten met een zachte begrenzer, en als mp3 opslaan.
 */
import lamejs from '@breezystack/lamejs';

export const SAMPLERATE = 24000;
/** Alle opnames komen op deze luidheid (LUFS, geïntegreerd). */
export const DOEL_LUFS = -18;
/** Hoogste piek na het gelijktrekken (0,89 is ongeveer -1 dBFS). */
export const MAX_PIEK = 0.89;

/** 16-bit little-endian PCM (zoals ElevenLabs `pcm_24000` levert) naar getallen tussen -1 en 1. */
export function pcmNaarFloat(buf: Buffer): Float32Array {
  const n = Math.floor(buf.length / 2);
  const uit = new Float32Array(n);
  for (let i = 0; i < n; i++) uit[i] = buf.readInt16LE(i * 2) / 32768;
  return uit;
}

/** Een wav-bestand (16-bit mono) van de samples, bijvoorbeeld om aan een transcriptiedienst te geven. */
export function maakWav(samples: Float32Array, sampleRate = SAMPLERATE): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  const kop = Buffer.alloc(44);
  kop.write('RIFF', 0);
  kop.writeUInt32LE(36 + data.length, 4);
  kop.write('WAVEfmt ', 8);
  kop.writeUInt32LE(16, 16);
  kop.writeUInt16LE(1, 20);
  kop.writeUInt16LE(1, 22);
  kop.writeUInt32LE(sampleRate, 24);
  kop.writeUInt32LE(sampleRate * 2, 28);
  kop.writeUInt16LE(2, 32);
  kop.writeUInt16LE(16, 34);
  kop.write('data', 36);
  kop.writeUInt32LE(data.length, 40);
  return Buffer.concat([kop, data]);
}

export const piek = (s: Float32Array) => s.reduce((m, x) => Math.max(m, Math.abs(x)), 0);

/** Knipt stilte weg aan begin en eind, met een beetje lucht en een zachte in- en uitfade. */
export function trimEnFade(s: Float32Array, sampleRate = SAMPLERATE): Float32Array {
  const p = piek(s);
  if (p === 0) return s;
  const drempel = Math.max(0.004, p * 0.03);
  let begin = 0;
  while (begin < s.length && Math.abs(s[begin]) < drempel) begin++;
  let eind = s.length - 1;
  while (eind > begin && Math.abs(s[eind]) < drempel) eind--;
  const voor = Math.floor(sampleRate * 0.035);
  const na = Math.floor(sampleRate * 0.09);
  const uit = s.slice(Math.max(0, begin - voor), Math.min(s.length, eind + na));
  const fadeIn = Math.floor(sampleRate * 0.008);
  const fadeUit = Math.floor(sampleRate * 0.05);
  for (let i = 0; i < Math.min(fadeIn, uit.length); i++) uit[i] *= i / fadeIn;
  for (let i = 0; i < Math.min(fadeUit, uit.length); i++) uit[uit.length - 1 - i] *= i / fadeUit;
  return uit;
}

// ---------------------------------------------------------------- Luidheid (K-weging)
type Biquad = { b: [number, number, number]; a: [number, number] };

/** Filters van BS.1770 voor elke samplefrequentie: hoge plank en hoogdoorlaat. */
function kFilters(fs: number): Biquad[] {
  const shelf = (() => {
    const G = 3.999843853973347;
    const Q = 0.7071752369554196;
    const fc = 1681.9744509555319;
    const K = Math.tan((Math.PI * fc) / fs);
    const Vh = Math.pow(10, G / 20);
    const Vb = Math.pow(Vh, 0.4996667741545416);
    const a0 = 1 + K / Q + K * K;
    return {
      b: [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0],
      a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0],
    } as Biquad;
  })();
  const hoogdoorlaat = (() => {
    const Q = 0.5003270373253953;
    const fc = 38.13547087613982;
    const K = Math.tan((Math.PI * fc) / fs);
    const a0 = 1 + K / Q + K * K;
    return { b: [1, -2, 1], a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] } as Biquad;
  })();
  return [shelf, hoogdoorlaat];
}

function filter(x: Float32Array, f: Biquad): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = f.b[0] * x[i] + f.b[1] * x1 + f.b[2] * x2 - f.a[0] * y1 - f.a[1] * y2;
    y[i] = v;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
  }
  return y;
}

/** Geïntegreerde luidheid in LUFS (met de twee poorten van R128), of -Infinity bij stilte. */
export function luidheid(s: Float32Array, fs = SAMPLERATE): number {
  let w = s;
  for (const f of kFilters(fs)) w = filter(w, f);
  const blok = Math.floor(fs * 0.4);
  const stap = Math.floor(fs * 0.1);
  const energie: number[] = [];
  if (w.length <= blok) {
    energie.push(w.reduce((t, x) => t + x * x, 0) / Math.max(1, w.length));
  } else {
    for (let i = 0; i + blok <= w.length; i += stap) {
      let t = 0;
      for (let j = i; j < i + blok; j++) t += w[j] * w[j];
      energie.push(t / blok);
    }
  }
  const lu = (e: number) => -0.691 + 10 * Math.log10(e);
  const boven = energie.filter((e) => e > 0 && lu(e) > -70);
  if (boven.length === 0) return -Infinity;
  const gem = boven.reduce((t, e) => t + e, 0) / boven.length;
  const relatief = lu(gem) - 10;
  const gated = boven.filter((e) => lu(e) > relatief);
  const eind = (gated.length ? gated : boven).reduce((t, e) => t + e, 0) / (gated.length || boven.length);
  return lu(eind);
}

/** Zachte begrenzer: tot 0,7 ongemoeid, daarboven gaat het geleidelijk naar MAX_PIEK. */
export function begrens(s: Float32Array): Float32Array {
  const knik = 0.7;
  const rest = MAX_PIEK - knik;
  return s.map((x) => {
    const a = Math.abs(x);
    return a <= knik ? x : Math.sign(x) * (knik + rest * Math.tanh((a - knik) / rest));
  });
}

/** Zet de samples op de doelluidheid. Geeft ook de gemeten luidheid ervoor en erna terug. */
export function gelijkTrekken(s: Float32Array, fs = SAMPLERATE, doel = DOEL_LUFS): { samples: Float32Array; was: number; wordt: number } {
  const was = luidheid(s, fs);
  if (!Number.isFinite(was)) return { samples: s, was, wordt: was };
  const factor = Math.pow(10, (doel - was) / 20);
  const luider = begrens(s.map((x) => x * factor));
  return { samples: luider, was, wordt: luidheid(luider, fs) };
}

// ---------------------------------------------------------------- mp3
export function naarMp3(s: Float32Array, fs = SAMPLERATE, kbps = 64): Buffer {
  const enc = new lamejs.Mp3Encoder(1, fs, kbps);
  const int = new Int16Array(s.length);
  for (let i = 0; i < s.length; i++) int[i] = Math.max(-32768, Math.min(32767, Math.round(s[i] * 32767)));
  const delen: Buffer[] = [];
  const blok = 1152;
  for (let i = 0; i < int.length; i += blok) {
    const d = enc.encodeBuffer(int.subarray(i, i + blok));
    if (d.length) delen.push(Buffer.from(d.buffer, d.byteOffset, d.length));
  }
  const rest = enc.flush();
  if (rest.length) delen.push(Buffer.from(rest.buffer, rest.byteOffset, rest.length));
  return Buffer.concat(delen);
}
