import confetti from 'canvas-confetti';
import { vg } from '../store/voortgang.svelte';

const KLEUREN = ['#fbbf24', '#fde68a', '#f472b6', '#60a5fa', '#22d3ee', '#ffffff'];

/** Welk feest heeft Lucas in de winkel aangezet? */
const feest = () => vg.winkel.gekozen.feest;

function vormen(): { shapes: confetti.Shape[]; colors: string[] } {
  switch (feest()) {
    case 'bliksemfeest':
      return { shapes: [confetti.shapeFromText({ text: '⚡', scalar: 2 }), 'star'], colors: ['#fde047', '#facc15', '#ffffff', '#60a5fa'] };
    case 'hartjes':
      return { shapes: [confetti.shapeFromText({ text: '💖', scalar: 2 }), confetti.shapeFromText({ text: '💗', scalar: 2 })], colors: ['#f472b6', '#fb7185'] };
    case 'vuurwerk':
      return { shapes: ['circle', 'star'], colors: ['#f87171', '#fbbf24', '#a78bfa', '#38bdf8', '#4ade80', '#ffffff'] };
    default:
      return { shapes: ['star', 'circle'], colors: KLEUREN };
  }
}

/** Klein feestje op een plek op het scherm (bijv. waar de robot stond). */
export function glitterOp(el: Element | null) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const { shapes, colors } = vormen();
  const origin = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight };
  const vuurwerk = feest() === 'vuurwerk';
  confetti({
    particleCount: vuurwerk ? 70 : 40,
    spread: vuurwerk ? 360 : 70,
    startVelocity: vuurwerk ? 22 : 28,
    gravity: vuurwerk ? 0.6 : 0.9,
    ticks: vuurwerk ? 150 : 120,
    scalar: vuurwerk ? 0.8 : 0.9,
    shapes,
    colors,
    origin,
    disableForReducedMotion: true,
  });
}

/** Groot feest voor het einde van een ronde. */
export function grootFeest() {
  const einde = Date.now() + 1800;
  const { shapes, colors } = vormen();
  const vuurwerk = feest() === 'vuurwerk';
  (function frame() {
    if (vuurwerk) {
      confetti({ particleCount: 30, spread: 360, startVelocity: 26, gravity: 0.6, ticks: 140, scalar: 0.8, origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.4 }, colors, shapes });
    } else {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors, shapes });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors, shapes });
    }
    if (Date.now() < einde) setTimeout(() => requestAnimationFrame(frame), vuurwerk ? 260 : 0);
  })();
}
