import { speelBoem, speelKatapult } from '../audio/geluid';
import { glitterOp } from './feest';

const STER = `<svg viewBox="-50 -50 100 100" width="100%" height="100%"><defs><radialGradient id="bm"><stop offset="0" stop-color="#fff"/><stop offset="0.35" stop-color="#fde047"/><stop offset="0.75" stop-color="#f97316"/><stop offset="1" stop-color="#dc2626"/></radialGradient></defs><polygon points="0,-48 10,-22 36,-34 26,-8 50,0 26,8 36,34 10,22 0,48 -10,22 -36,34 -26,8 -50,0 -26,-8 -36,-34 -10,-22" fill="url(#bm)" stroke="#7c2d12" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

/**
 * Een ontploffing op een plek: een stervormige knal, rondvliegende stukken, confetti en geluid.
 * `grootte` is de breedte van de knal in pixels.
 */
export function boem(el: Element | null | undefined, grootte = 220) {
  if (!el) return;
  speelBoem();
  glitterOp(el);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  schud(grootte > 180 ? 9 : 5);
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  const knal = document.createElement('div');
  knal.innerHTML = STER;
  Object.assign(knal.style, {
    position: 'fixed', left: `${cx - grootte / 2}px`, top: `${cy - grootte / 2}px`, width: `${grootte}px`, height: `${grootte}px`,
    zIndex: '70', pointerEvents: 'none', filter: 'drop-shadow(0 0 24px #fde047)',
  });
  document.body.appendChild(knal);
  knal
    .animate(
      [
        { transform: 'scale(0.2) rotate(-12deg)', opacity: 1 },
        { transform: 'scale(1.15) rotate(6deg)', opacity: 1, offset: 0.35 },
        { transform: 'scale(1.5) rotate(10deg)', opacity: 0 },
      ],
      { duration: 520, easing: 'ease-out' },
    )
    .finished.then(() => knal.remove());

  // Stukken en stenen die wegvliegen
  const kleuren = ['#7c4a1e', '#a8641f', '#64748b', '#94a3b8', '#fbbf24', '#ef4444'];
  for (let i = 0; i < 12; i++) {
    const stuk = document.createElement('div');
    const maat = 10 + Math.random() * 16;
    Object.assign(stuk.style, {
      position: 'fixed', left: `${cx - maat / 2}px`, top: `${cy - maat / 2}px`, width: `${maat}px`, height: `${maat}px`,
      background: kleuren[i % kleuren.length], border: '2px solid #0a1540', borderRadius: '3px', zIndex: '71', pointerEvents: 'none',
    });
    document.body.appendChild(stuk);
    const hoek = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
    const afstand = 90 + Math.random() * 130;
    stuk
      .animate(
        [
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
          { transform: `translate(${Math.cos(hoek) * afstand}px, ${Math.sin(hoek) * afstand - 50}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${Math.cos(hoek) * afstand * 1.15}px, ${Math.sin(hoek) * afstand + 90}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
        ],
        { duration: 800 + Math.random() * 300, easing: 'ease-out' },
      )
      .finished.then(() => stuk.remove());
  }
}

/** Het hele scherm schudt even mee met een knal. */
export function schud(sterkte = 8) {
  const podium = document.querySelector('.buhne');
  if (!podium) return;
  const huidig = getComputedStyle(podium).transform;
  const basis = huidig === 'none' ? '' : huidig;
  podium.animate(
    [
      { transform: `${basis} translate(0, 0)` },
      { transform: `${basis} translate(${-sterkte}px, ${sterkte * 0.6}px)` },
      { transform: `${basis} translate(${sterkte}px, ${-sterkte * 0.5}px)` },
      { transform: `${basis} translate(${-sterkte * 0.6}px, ${-sterkte * 0.4}px)` },
      { transform: `${basis} translate(${sterkte * 0.4}px, ${sterkte * 0.3}px)` },
      { transform: `${basis} translate(0, 0)` },
    ],
    { duration: 330, easing: 'ease-out' },
  );
}

/** Een steen die in een boog van de ene naar de andere plek vliegt (voor de katapult). */
export function werp(van: Element | null | undefined, naar: Element | null | undefined, duur = 650): Promise<void> {
  if (!van || !naar) return Promise.resolve();
  speelKatapult();
  const a = van.getBoundingClientRect();
  const b = naar.getBoundingClientRect();
  const x0 = a.left + a.width / 2 - 20;
  const y0 = a.top + a.height / 2 - 20;
  const x1 = b.left + b.width / 2 - 20;
  const y1 = b.top + b.height / 2 - 20;
  const steen = document.createElement('div');
  Object.assign(steen.style, {
    position: 'fixed', left: '0', top: '0', width: '40px', height: '40px', borderRadius: '45% 55% 50% 50%', zIndex: '70',
    pointerEvents: 'none', background: 'radial-gradient(circle at 35% 30%, #cbd5e1, #64748b 60%, #334155)', border: '3px solid #0a1540',
  });
  document.body.appendChild(steen);
  const top = Math.min(y0, y1) - 160;
  return steen
    .animate(
      [
        { transform: `translate(${x0}px, ${y0}px) rotate(0)` },
        { transform: `translate(${(x0 + x1) / 2}px, ${top}px) rotate(300deg)`, offset: 0.5 },
        { transform: `translate(${x1}px, ${y1}px) rotate(640deg)` },
      ],
      { duration: duur, easing: 'cubic-bezier(.3,.1,.6,.9)' },
    )
    .finished.then(() => steen.remove());
}
