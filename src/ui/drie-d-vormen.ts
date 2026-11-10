/**
 * Extra 3D-vormen voor de nieuwe spellen: een ster, bliksem, bom, robot en wolk,
 * plus doorzichtige plaatjes met een getal of emoji erop.
 */
import { CanvasTexture, DoubleSide, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Shape, SphereGeometry, SRGBColorSpace } from 'three';
import { bol, cilinder, kegel, kubus, omlijn, toon } from './drie-d';

/** Een dikke ster. */
export function sterVorm(kleur: number | string = 0xfbbf24, r = 0.55, diepte = 0.28): Mesh {
  const vorm = new Shape();
  for (let i = 0; i < 10; i++) {
    const hoek = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    const x = Math.cos(hoek) * rr;
    const y = Math.sin(hoek) * rr;
    if (i === 0) vorm.moveTo(x, y);
    else vorm.lineTo(x, y);
  }
  vorm.closePath();
  const geo = new ExtrudeGeometry(vorm, { depth: diepte, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  geo.translate(0, 0, -diepte / 2);
  return omlijn(new Mesh(geo, toon(kleur, 0.35)), 0.05);
}

/** Een bliksemschicht. */
export function bliksemVorm(kleur: number | string = 0xfde047, h = 1.1, diepte = 0.26): Mesh {
  const k = h / 2;
  const vorm = new Shape();
  vorm.moveTo(0.12 * k, 1 * k);
  vorm.lineTo(-0.62 * k, -0.1 * k);
  vorm.lineTo(-0.08 * k, -0.1 * k);
  vorm.lineTo(-0.3 * k, -1 * k);
  vorm.lineTo(0.62 * k, 0.18 * k);
  vorm.lineTo(0.06 * k, 0.18 * k);
  vorm.closePath();
  const geo = new ExtrudeGeometry(vorm, { depth: diepte, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
  geo.translate(0, 0, -diepte / 2);
  return omlijn(new Mesh(geo, toon(kleur, 0.45)), 0.05);
}

/** Een kleine bom met lontje (voor in een patroon). */
export function bomVorm(r = 0.42): Group {
  const g = new Group();
  g.add(bol(r, 0x1f2937));
  const dop = cilinder(r * 0.3, r * 0.3, 0x94a3b8);
  dop.position.y = r * 0.95;
  g.add(dop);
  const vonk = bol(r * 0.2, 0xfb923c);
  vonk.position.set(r * 0.15, r * 1.35, 0);
  g.add(vonk);
  return g;
}

/** Een klein robotje (voor in een patroon). */
export function robotVorm(r = 0.42): Group {
  const g = new Group();
  const hoofd = kubus(r * 1.5, r * 1.3, r * 1.3, 0x94a3b8);
  g.add(hoofd);
  for (const x of [-0.28, 0.28]) {
    const oog = bol(r * 0.2, 0x22d3ee);
    oog.position.set(x * r * 1.6, r * 0.12, r * 0.64);
    g.add(oog);
  }
  const stok = cilinder(r * 0.06, r * 0.6, 0x64748b);
  stok.position.y = r * 0.95;
  g.add(stok);
  const knop = bol(r * 0.14, 0xef4444);
  knop.position.y = r * 1.3;
  g.add(knop);
  return g;
}

/** Een pluizige wolk van bollen. */
export function wolkVorm(schaal = 1, kleur: number | string = 0xffffff): Group {
  const g = new Group();
  for (const [x, y, r] of [[0, 0, 1.2], [1.3, -0.1, 0.95], [-1.3, -0.15, 0.9], [0.6, 0.55, 0.9], [-0.55, 0.45, 0.8]] as const) {
    const b = new Mesh(new SphereGeometry(r, 14, 10), toon(kleur));
    b.position.set(x, y, 0);
    g.add(b);
  }
  g.scale.setScalar(schaal);
  return g;
}

function plaat(tex: CanvasTexture, breed: number, hoog: number): Mesh {
  const m = new Mesh(new PlaneGeometry(breed, hoog), new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide, depthWrite: false }));
  return m;
}

/** Een rond bordje met een getal of letter erin, doorzichtig om het bordje heen. */
export function getalPlaat(tekst: string | number, breed = 0.9, achter = '#fde047', voor = '#3b1d00'): Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = achter;
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = '#7c2d12';
  g.stroke();
  g.fillStyle = voor;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lees = getComputedStyle(document.body).getPropertyValue('--font-lees').trim() || 'sans-serif';
  g.font = `700 ${String(tekst).length > 1 ? 62 : 78}px ${lees}`;
  g.fillText(String(tekst), 64, 70);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return plaat(t, breed, breed);
}

/** Een emoji als doorzichtig plaatje (voor het plaatje bij een woord). */
export function emojiPlaat(emoji: string, breed = 3): Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `190px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`;
  g.fillText(emoji, 128, 140);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return plaat(t, breed, breed);
}

/** Een vragenteken-plaatje dat in een patroon de lege plek aangeeft. */
export const vraagPlaat = (breed = 1.1) => getalPlaat('?', breed, '#fde68a');

/** Het 3D-plaatje bij een patroon-emoji. */
export function patroonSymbool(emoji: string): Group {
  const g = new Group();
  const kleurbol: Record<string, number> = { '🔴': 0xef4444, '🔵': 0x3b82f6, '🟡': 0xfacc15, '🟢': 0x22c55e };
  if (kleurbol[emoji] !== undefined) {
    g.add(bol(0.46, kleurbol[emoji]));
    const glans = bol(0.1, 0xffffff, [1, 1, 1], 0);
    glans.position.set(-0.17, 0.2, 0.36);
    g.add(glans);
  } else if (emoji === '⭐') g.add(sterVorm(0xfbbf24, 0.62));
  else if (emoji === '⚡') g.add(bliksemVorm(0xfde047, 1.3));
  else if (emoji === '💣') g.add(bomVorm(0.46));
  else if (emoji === '🤖') g.add(robotVorm(0.5));
  else g.add(kegel(0.4, 0.9, 0xa855f7));
  return g;
}

/** Ruim een groepje 3D-dingen netjes op (geheugen van de grafische kaart). */
export function ruimOp(o: Group | Mesh) {
  o.traverse((x) => {
    const m = x as Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      const map = (mat as MeshBasicMaterial).map;
      // De gedeelde stripfiguur-materialen hebben geen eigen plaatje; alleen platte plaatjes ruimen we op.
      if (map && (mat as MeshBasicMaterial).transparent) {
        map.dispose();
        mat.dispose();
      }
    }
  });
  o.parent?.remove(o);
}
