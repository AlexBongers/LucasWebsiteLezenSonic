/** Gouden ringen die van een plek naar de ringenteller vliegen. */
const NOOT_SVG = `<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="15" fill="none" stroke="#fbbf24" stroke-width="8"/><circle cx="20" cy="20" r="15" fill="none" stroke="#fff7c2" stroke-width="1.5"/></svg>`;

export function vliegRingen(aantal: number, van: Element | null | undefined, naar: Element | null | undefined) {
  if (!naar || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const doel = naar.getBoundingClientRect();
  const bron = van?.getBoundingClientRect() ?? new DOMRect(innerWidth / 2 - 20, innerHeight / 2 - 20, 40, 40);
  const x0 = bron.left + bron.width / 2 - 20;
  const y0 = bron.top + bron.height / 2 - 20;
  const x1 = doel.left + 6;
  const y1 = doel.top + doel.height / 2 - 20;
  for (let i = 0; i < Math.min(aantal, 6); i++) {
    const el = document.createElement('div');
    el.innerHTML = NOOT_SVG;
    Object.assign(el.style, {
      position: 'fixed', left: '0', top: '0', zIndex: '70', pointerEvents: 'none',
      filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.9))',
    });
    document.body.appendChild(el);
    const dx = (Math.random() - 0.5) * 160;
    const anim = el.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) scale(0.4)`, opacity: 0 },
        { transform: `translate(${x0 + dx}px, ${y0 - 90 - Math.random() * 60}px) scale(1.2)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${x1}px, ${y1}px) scale(0.7)`, opacity: 1 },
      ],
      { duration: 850, delay: i * 110, easing: 'cubic-bezier(.5,0,.4,1)', fill: 'backwards' },
    );
    anim.onfinish = () => el.remove();
  }
}
