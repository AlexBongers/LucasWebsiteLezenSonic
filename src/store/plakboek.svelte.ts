/**
 * Stickers verdienen en in het plakboek plakken.
 */
import { BLADZIJDEN, RINGEN_DUBBEL, RINGEN_VOLLE_BLADZIJDE, GLIM_KANS, bladzijdeVan, kiesSticker } from '../games/stickers';
import { bewaar, vg } from './voortgang.svelte';
import { verdien } from './winkel.svelte';

export type StickerWinst = {
  woord: string;
  glim: boolean;
  /** Had hij deze nog niet? */
  nieuw: boolean;
  /** Een dubbele: die levert ringen op. */
  dubbel: boolean;
  /** Is hiermee een bladzijde vol geworden? */
  bladzijdeVol: string | null;
};

export const aantalVan = (w: string) => vg.plakboek.stickers[w] ?? 0;
export const heeftSticker = (w: string) => aantalVan(w) > 0;
export const glimt = (w: string) => vg.plakboek.glim.includes(w);
export const aantalVerzameld = () => Object.keys(vg.plakboek.stickers).filter((w) => vg.plakboek.stickers[w] > 0).length;
export const bladzijdeTelling = (id: string) => {
  const b = BLADZIJDEN.find((x) => x.id === id)!;
  return { heeft: b.woorden.filter(heeftSticker).length, totaal: b.woorden.length };
};

/** Geef Lucas één sticker. `glim` dwingt een glimmende af (glimzakje). */
export function geefSticker(opt: { glim?: boolean; rnd?: () => number } = {}): StickerWinst {
  const rnd = opt.rnd ?? Math.random;
  const woord = kiesSticker(heeftSticker, rnd);
  const nieuw = !heeftSticker(woord);
  const glim = opt.glim ?? rnd() < GLIM_KANS;
  const nieuweGlim = glim && !glimt(woord);
  vg.plakboek.stickers = { ...vg.plakboek.stickers, [woord]: aantalVan(woord) + 1 };
  if (nieuweGlim) vg.plakboek.glim = [...vg.plakboek.glim, woord];
  const dubbel = !nieuw && !nieuweGlim;
  if (dubbel) verdien(RINGEN_DUBBEL);

  let bladzijdeVol: string | null = null;
  const b = bladzijdeVan(woord);
  if (nieuw && !vg.plakboek.vol.includes(b.id) && b.woorden.every(heeftSticker)) {
    vg.plakboek.vol = [...vg.plakboek.vol, b.id];
    verdien(RINGEN_VOLLE_BLADZIJDE);
    bladzijdeVol = b.id;
  }
  void bewaar();
  return { woord, glim, nieuw, dubbel, bladzijdeVol };
}

/** Een zakje uit de winkel openmaken. */
export function openZakje(id: string): StickerWinst[] {
  if (id === 'glimzakje') return [geefSticker({ glim: true }), geefSticker({ glim: false })];
  return [geefSticker(), geefSticker(), geefSticker()];
}
