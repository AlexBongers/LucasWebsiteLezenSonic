/**
 * Gedeelde 3D-basis voor de 3D-spellen (Three.js): een toneel met cartoon-materialen,
 * omlijning, brokstukken die wegvliegen, letter-teksturen en een speelbare held van blokjes en bollen.
 * Alles is zelf getekend; er worden geen externe modellen of afbeeldingen geladen.
 */
import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  RedFormat,
  RepeatWrapping,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  Fog,
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  MeshLambertMaterial,
  PlaneGeometry,
  Points,
  Sprite,
  SpriteMaterial,
  PointsMaterial,
  AdditiveBlending,
  Float32BufferAttribute,
  BufferGeometry as Geometrie,
  type BufferGeometry,
  type Material,
} from 'three';

export { Vector3, Group, Mesh, Color };
export type { Object3D };

/** Kan dit apparaat WebGL? Zo niet, dan nemen de 3D-spellen hun gewone 2D-broertje. */
export function webglKan(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ Materialen
let trapje: DataTexture | null = null;
function verloop(): DataTexture {
  if (!trapje) {
    trapje = new DataTexture(new Uint8Array([95, 165, 220, 255]), 4, 1, RedFormat);
    trapje.minFilter = NearestFilter;
    trapje.magFilter = NearestFilter;
    trapje.needsUpdate = true;
  }
  return trapje;
}

const materialen = new Map<string, MeshToonMaterial>();
/** Stripfiguur-materiaal (cel-shading in drie tinten). Gedeeld per kleur. */
export function toon(kleur: number | string, gloed = 0): MeshToonMaterial {
  const k = `${kleur}|${gloed}`;
  let m = materialen.get(k);
  if (!m) {
    m = new MeshToonMaterial({ color: kleur, gradientMap: verloop() });
    if (gloed) {
      m.emissive = new Color(kleur);
      m.emissiveIntensity = gloed;
    }
    materialen.set(k, m);
  }
  return m;
}

/** Een eigen (niet gedeeld) stripfiguur-materiaal met een plaatje erop. */
export function toonKaart(map: Texture, tint: number | string = 0xffffff): MeshToonMaterial {
  return new MeshToonMaterial({ color: tint, map, gradientMap: verloop() });
}

const lijn = new MeshBasicMaterial({ color: 0x0a1540, side: BackSide });
/** Een donkere rand rond een figuur (een iets grotere, binnenstebuiten gekeerde kopie). */
export function omlijn<T extends Mesh>(mesh: T, dikte = 0.07): T {
  const rand = new Mesh(mesh.geometry, lijn);
  rand.scale.setScalar(1 + dikte);
  mesh.add(rand);
  return mesh;
}

/** Een bol, kubus of kegel met materiaal en omlijning in één keer. */
export function bol(r: number, kleur: number | string, schaal: [number, number, number] = [1, 1, 1], dikte = 0.08): Mesh {
  const m = new Mesh(new SphereGeometry(r, 32, 22), toon(kleur));
  m.scale.set(...schaal);
  return omlijn(m, dikte);
}
export function kubus(x: number, y: number, z: number, kleur: number | string, dikte = 0.05): Mesh {
  return omlijn(new Mesh(new BoxGeometry(x, y, z), toon(kleur)), dikte);
}
export function kegel(r: number, h: number, kleur: number | string, dikte = 0.08): Mesh {
  return omlijn(new Mesh(new ConeGeometry(r, h, 10), toon(kleur)), dikte);
}
export function cilinder(r: number, h: number, kleur: number | string, dikte = 0.06): Mesh {
  return omlijn(new Mesh(new CylinderGeometry(r, r, h, 14), toon(kleur)), dikte);
}
export function ring(r = 0.5, buis = 0.14, kleur: number | string = 0xfbbf24): Mesh {
  const m = new Mesh(new TorusGeometry(r, buis, 12, 28), toon(kleur, 0.5));
  m.add(gloed(r * 3.2, kleur));
  return m;
}

let gloedTex: CanvasTexture | null = null;
/** Een zachte lichtkrans (altijd naar de camera gedraaid). */
export function gloed(maat: number, kleur: number | string = 0xfde68a, sterkte = 0.55): Sprite {
  if (!gloedTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const v = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    v.addColorStop(0, 'rgba(255,255,255,0.9)');
    v.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    v.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = v;
    g.fillRect(0, 0, 128, 128);
    gloedTex = new CanvasTexture(c);
  }
  const sp = new Sprite(new SpriteMaterial({ map: gloedTex, color: kleur, transparent: true, opacity: sterkte, depthWrite: false, blending: AdditiveBlending }));
  sp.scale.setScalar(maat);
  sp.userData.gloed = true;
  return sp;
}

// ------------------------------------------------------------------ Teksturen
/** Een vierkant plaatje met een letter, cijfer of woord, als tekstuur. */
export function letterTekstuur(tekst: string, achter = '#fde68a', voor = '#0f172a', rand = '#1e293b'): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = achter;
  g.fillRect(0, 0, 256, 256);
  const lichter = g.createRadialGradient(90, 80, 10, 128, 128, 190);
  lichter.addColorStop(0, 'rgba(255,255,255,0.55)');
  lichter.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lichter;
  g.fillRect(0, 0, 256, 256);
  g.lineWidth = 16;
  g.strokeStyle = rand;
  g.strokeRect(8, 8, 240, 240);
  g.fillStyle = voor;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lees = getComputedStyle(document.body).getPropertyValue('--font-lees').trim() || 'sans-serif';
  g.font = `700 ${tekst.length > 2 ? 100 : tekst.length > 1 ? 130 : 180}px ${lees}`;
  g.fillText(tekst, 128, 140);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Verloop voor de lucht. */
export function luchtTekstuur(boven: string, midden: string, onder: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, boven);
  v.addColorStop(0.6, midden);
  v.addColorStop(1, onder);
  g.fillStyle = v;
  g.fillRect(0, 0, 4, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Een ruitjesvloer (herhaalt zich). */
export function ruitTekstuur(a: string, b: string, herhaal: [number, number]): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = a;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = b;
  g.fillRect(0, 0, 64, 64);
  g.fillRect(64, 64, 64, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(...herhaal);
  t.anisotropy = 4;
  return t;
}

/** Een vloer die licht en schaduwen opvangt. */
export function vloer(map: Texture | null, breed: number, lang: number, kleur: number | string = 0xffffff): Mesh {
  const m = new Mesh(new PlaneGeometry(breed, lang), new MeshLambertMaterial({ map, color: kleur }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.userData.vloer = true;
  return m;
}

/** Glitters: kleine lichtpuntjes die door de lucht zweven. */
function glitterWolk(kleur: number, aantal = 140): Points {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const v = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  v.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(c);
  const pos: number[] = [];
  for (let i = 0; i < aantal; i++) pos.push((Math.random() - 0.5) * 46, Math.random() * 16, -24 + Math.random() * 30);
  const geo = new Geometrie();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const mat = new PointsMaterial({ map: tex, color: kleur, size: 0.32, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending });
  return new Points(geo, mat);
}

// ------------------------------------------------------------------ Kwaliteit
/**
 * Hoog: scherp beeld en zachte schaduwen. Midden: minder pixels. Laag: ook geen schaduwen.
 * De site meet zelf hoe snel het apparaat is en onthoudt de stand voor de volgende keer.
 */
type Kwaliteit = 'hoog' | 'midden' | 'laag';
const KWALITEIT_SLEUTEL = 'lucas-3d-kwaliteit';
function leesKwaliteit(): Kwaliteit {
  try {
    const k = localStorage.getItem(KWALITEIT_SLEUTEL);
    if (k === 'hoog' || k === 'midden' || k === 'laag') return k;
  } catch {
    // geen opslag
  }
  return 'hoog';
}
function bewaarKwaliteit(k: Kwaliteit) {
  try {
    localStorage.setItem(KWALITEIT_SLEUTEL, k);
  } catch {
    // geen opslag
  }
}

// ------------------------------------------------------------------ Toneel
export type Toneel = {
  scene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  /** Roep dit elke beeldje aan: (verstreken seconden, totale tijd). */
  bij: (f: (dt: number, t: number) => void) => void;
  /** Waar staat dit punt in de 3D-wereld op het scherm (in pixels binnen het vak)? */
  projecteer: (v: Vector3) => { x: number; y: number };
  /** Welk van deze objecten zit onder de vinger? */
  raak: (clientX: number, clientY: number, objecten: Object3D[]) => Object3D | null;
  stop: () => void;
};

export function maakToneel(
  host: HTMLElement,
  opt: { lucht?: [string, string, string]; mist?: number; mistAfstand?: [number, number]; fov?: number; glitter?: number } = {},
): Toneel {
  let kwaliteit = leesKwaliteit();
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, kwaliteit === 'laag' ? 1 : 1.5));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
  host.appendChild(canvas);

  const scene = new Scene();
  const [boven, midden, onder] = opt.lucht ?? ['#38bdf8', '#7dd3fc', '#e0f2fe'];
  scene.background = luchtTekstuur(boven, midden, onder);
  if (opt.mist !== undefined) {
    const [van, tot] = opt.mistAfstand ?? [30, 110];
    scene.fog = new Fog(opt.mist, van, tot);
  }
  scene.add(new HemisphereLight(0xffffff, 0x6b7a8f, 1.55));
  const zon = new DirectionalLight(0xfff3d6, 2.4);
  zon.position.set(9, 20, 12);
  zon.castShadow = kwaliteit !== 'laag';
  zon.shadow.mapSize.set(1024, 1024);
  const sc = zon.shadow.camera;
  sc.left = -20;
  sc.right = 20;
  sc.top = 20;
  sc.bottom = -20;
  sc.near = 1;
  sc.far = 70;
  zon.shadow.bias = -0.0005;
  zon.shadow.normalBias = 0.03;
  zon.shadow.radius = 4;
  scene.add(zon);
  scene.add(zon.target);
  // Randlicht van achteren: figuren komen los van de achtergrond
  const rand = new DirectionalLight(0xbfe3ff, 1.1);
  rand.position.set(-10, 9, -14);
  scene.add(rand);
  // Glitters in de lucht
  const glitter = glitterWolk(opt.glitter ?? 0xfff7c2);
  scene.add(glitter);



  const camera = new PerspectiveCamera(opt.fov ?? 55, 1, 0.1, 400);
  const formaat = () => {
    const w = host.clientWidth || 1280;
    const h = host.clientHeight || 700;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  formaat();
  const ro = new ResizeObserver(formaat);
  ro.observe(host);

  const zetSchaduwen = () => {
    if (!zon.castShadow) return;
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh || m.userData.schaduwKlaar) return;
      m.userData.schaduwKlaar = true;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (m.userData.vloer) return;
      if (mat === lijn || (mat as MeshBasicMaterial).transparent) return;
      m.castShadow = true;
      m.receiveShadow = !(mat instanceof MeshBasicMaterial);
    });
  };

  // Snelheid meten: is het apparaat te traag, dan een stand lager (en onthouden).
  let beeldjes = 0;
  let meetSom = 0;
  let meetAantal = 0;
  const meet = (dt: number) => {
    if (beeldjes < 30 || kwaliteit === 'laag') return;
    meetSom += dt;
    meetAantal++;
    if (meetAantal < 90) return;
    const gem = meetSom / meetAantal;
    meetSom = 0;
    meetAantal = 0;
    if (gem > 1 / 38) {
      if (kwaliteit === 'hoog') {
        kwaliteit = 'midden';
        renderer.setPixelRatio(1);
        formaat();
      } else {
        kwaliteit = 'laag';
        zon.castShadow = false;
        renderer.setPixelRatio(1);
        formaat();
      }
      bewaarKwaliteit(kwaliteit);
    }
  };

  const functies: ((dt: number, t: number) => void)[] = [];
  let raf = 0;
  let vorige = performance.now();
  let tijd = 0;
  let gestopt = false;
  const lus = (nu: number) => {
    if (gestopt) return;
    raf = requestAnimationFrame(lus);
    const dt = Math.min(0.05, (nu - vorige) / 1000);
    vorige = nu;
    if (document.hidden) return;
    tijd += dt;
    for (const f of functies) f(dt, tijd);
    beeldjes++;
    // De zon (en zijn schaduwvak) loopt mee met de camera
    zon.target.position.set(camera.position.x, 0, camera.position.z - 10);
    zon.position.set(camera.position.x + 9, 20, camera.position.z + 2);
    // Schaduwen: alles wat nieuw in beeld komt, werpt er een (behalve randen, plaatjes en glitters).
    if (beeldjes % 20 === 1) zetSchaduwen();
    glitter.rotation.y = Math.sin(tijd * 0.05) * 0.2;
    glitter.position.y = Math.sin(tijd * 0.4) * 0.4;
    (glitter.material as PointsMaterial).opacity = 0.65 + Math.sin(tijd * 2.3) * 0.2;
    meet(dt);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(lus);

  const straal = new Raycaster();
  const punt = new Vector2();

  return {
    scene,
    camera,
    canvas,
    bij: (f) => functies.push(f),
    projecteer: (v) => {
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * host.clientWidth, y: (-p.y * 0.5 + 0.5) * host.clientHeight };
    },
    raak: (cx, cy, objecten) => {
      const r = canvas.getBoundingClientRect();
      punt.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      straal.setFromCamera(punt, camera);
      const t = straal.intersectObjects(objecten, true)[0];
      return t ? t.object : null;
    },
    stop: () => {
      gestopt = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      const klaar = new Set<BufferGeometry | Material | Texture>();
      const gedeeld = new Set<MeshToonMaterial>(materialen.values());
      scene.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry && !klaar.has(m.geometry)) {
          klaar.add(m.geometry);
          m.geometry.dispose();
        }
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          // De gedeelde stripfiguur-materialen blijven bestaan voor het volgende spel.
          if (klaar.has(mat) || mat === lijn || gedeeld.has(mat as MeshToonMaterial)) continue;
          klaar.add(mat);
          const map = (mat as MeshBasicMaterial).map;
          if (map && !klaar.has(map)) {
            klaar.add(map);
            map.dispose();
          }
          mat.dispose();
        }
      });
      (scene.background as Texture | null)?.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

// ------------------------------------------------------------------ Brokstukken
type Stuk = { m: Mesh; v: Vector3; w: Vector3; leven: number };
const stukGeo = new BoxGeometry(1, 1, 1);

/** Blokjes die bij een ontploffing wegvliegen, stuiteren en verdwijnen. */
export class Brokken {
  private lijst: Stuk[] = [];
  constructor(
    private scene: Scene,
    private vloer = 0,
  ) {}

  spuit(pos: Vector3, kleuren: (number | string)[], aantal = 18, kracht = 7, omhoog = 5) {
    for (let i = 0; i < aantal; i++) {
      const m = new Mesh(stukGeo, toon(kleuren[i % kleuren.length]));
      const s = 0.18 + Math.random() * 0.34;
      m.scale.set(s, s, s);
      m.position.copy(pos);
      this.scene.add(m);
      const hoek = Math.random() * Math.PI * 2;
      const sterkte = kracht * (0.4 + Math.random() * 0.8);
      this.lijst.push({
        m,
        v: new Vector3(Math.cos(hoek) * sterkte, omhoog * (0.5 + Math.random()), Math.sin(hoek) * sterkte),
        w: new Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14),
        leven: 1.6 + Math.random() * 0.8,
      });
    }
  }

  update(dt: number) {
    for (let i = this.lijst.length - 1; i >= 0; i--) {
      const s = this.lijst[i];
      s.leven -= dt;
      s.v.y -= 24 * dt;
      s.m.position.addScaledVector(s.v, dt);
      s.m.rotation.x += s.w.x * dt;
      s.m.rotation.y += s.w.y * dt;
      s.m.rotation.z += s.w.z * dt;
      if (s.m.position.y < this.vloer + s.m.scale.y * 0.5) {
        s.m.position.y = this.vloer + s.m.scale.y * 0.5;
        s.v.y = Math.abs(s.v.y) * 0.45;
        s.v.x *= 0.8;
        s.v.z *= 0.8;
      }
      if (s.leven < 0.4) s.m.scale.multiplyScalar(0.9);
      if (s.leven <= 0) {
        this.scene.remove(s.m);
        this.lijst.splice(i, 1);
      }
    }
  }
}

/** Een kort lichtflitsje van sterren/ringen: handig bij een goed antwoord. */
export function ringenWolk(scene: Scene, pos: Vector3, n = 6): Group {
  const g = new Group();
  g.position.copy(pos);
  for (let i = 0; i < n; i++) {
    const r = ring(0.28, 0.08);
    r.userData.v = new Vector3((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 3);
    g.add(r);
  }
  scene.add(g);
  return g;
}

// ------------------------------------------------------------------ Kleding op de 3D-held
/** Hoeden, brillen en rugspullen uit de kleedkamer (de held kijkt naar -z, de rug is +z). */
function kleedAan(groep: Group, k: RennerKleding) {
  const zet = (m: Object3D, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    groep.add(m);
    return m;
  };
  switch (k.hoofd) {
    case 'pet': {
      zet(bol(0.66, 0x2563eb, [1, 0.55, 1]), 0, 2.2, 0);
      zet(kubus(0.75, 0.07, 0.6, 0x1d4ed8, 0.03), 0, 2.2, -0.75);
      break;
    }
    case 'feestmuts': {
      const m = zet(kegel(0.36, 1.0, 0xec4899), 0, 2.85, 0);
      m.rotation.z = 0.15;
      zet(bol(0.14, 0xfde047), -0.07, 3.38, 0);
      break;
    }
    case 'koptelefoon': {
      const boog = new Mesh(new TorusGeometry(0.76, 0.07, 8, 20, Math.PI), toon(0x475569));
      zet(boog, 0, 1.75, 0);
      for (const x of [-0.76, 0.76]) {
        const kap = zet(cilinder(0.22, 0.22, 0xef4444), x, 1.75, 0);
        kap.rotation.z = Math.PI / 2;
      }
      break;
    }
    case 'cowboyhoed': {
      zet(cilinder(1.05, 0.07, 0x92400e), 0, 2.32, 0);
      zet(cilinder(0.48, 0.5, 0xa16207), 0, 2.6, 0);
      zet(cilinder(0.5, 0.1, 0x7c2d12, 0.02), 0, 2.42, 0);
      break;
    }
    case 'kroon': {
      zet(cilinder(0.42, 0.28, 0xf59e0b), 0, 2.48, 0);
      for (let i = 0; i < 5; i++) {
        const h = (i / 5) * Math.PI * 2;
        zet(kegel(0.11, 0.3, 0xfbbf24, 0.05), Math.cos(h) * 0.36, 2.76, Math.sin(h) * 0.36);
      }
      zet(bol(0.08, 0xef4444), 0, 2.5, -0.43);
      break;
    }
  }
  if (k.bril === 'zonnebril') {
    for (const x of [-0.26, 0.26]) zet(kubus(0.36, 0.26, 0.06, 0x0f172a, 0.02), x, 1.88, -0.8);
    zet(kubus(0.2, 0.05, 0.05, 0x0f172a, 0.02), 0, 1.92, -0.8);
  } else if (k.bril === 'skibril') {
    zet(kubus(0.95, 0.34, 0.12, 0x06b6d4, 0.03), 0, 1.88, -0.78);
    const band = new Mesh(new TorusGeometry(0.72, 0.06, 8, 24), toon(0xf97316));
    band.rotation.x = Math.PI / 2;
    zet(band, 0, 1.88, 0);
  }
  if (k.rug === 'cape') {
    const cape = zet(kubus(1.15, 1.35, 0.06, 0xdc2626, 0.03), 0, 0.95, 0.68);
    cape.rotation.x = -0.18;
  } else if (k.rug === 'rugzak') {
    zet(kubus(0.85, 0.9, 0.42, 0x16a34a, 0.04), 0, 1.05, 0.62);
  } else if (k.rug === 'vleugels') {
    for (const x of [-0.6, 0.6]) {
      const v = zet(bol(0.5, 0xf0f9ff, [1.4, 0.7, 0.18]), x, 1.45, 0.62);
      v.rotation.z = x < 0 ? 0.5 : -0.5;
    }
  }
}

// ------------------------------------------------------------------ De renner
export type Renner = {
  groep: Group;
  update: (t: number, rent: boolean) => void;
  armen: Mesh[];
  hoofd: Mesh;
};

/**
 * Sonic, Tails of Knuckles, gebouwd van bollen en blokjes. Hij kijkt naar -z (je ziet hem van achteren),
 * maar heeft ook een gezicht: draai de groep een halve slag om hem van voren te laten zien.
 * Met `goud` is hij een superheld uit de winkel.
 */
export type RennerKleding = { hoofd: string; bril: string; schoen: string; rug: string };
const SCHOEN3D: Record<string, number> = { blauweschoenen: 0x2563eb, groeneschoenen: 0x16a34a, gouden_schoenen: 0xf59e0b, regenboogschoenen: 0xa855f7 };

export function maakRenner(wie: 'sonic' | 'tails' | 'knuckles', goud = false, kleding?: RennerKleding): Renner {
  const groep = new Group();
  const sonic = wie === 'sonic';
  const knuckles = wie === 'knuckles';
  const huid = goud ? 0xfacc15 : sonic ? 0x2563eb : knuckles ? 0xdc2626 : 0xf59e0b;
  const licht = sonic ? 0x60a5fa : 0xfde68a;
  const schoen = SCHOEN3D[kleding?.schoen ?? ''] ?? (knuckles ? 0x65a30d : 0xdc2626);

  const lijf = bol(0.62, huid, [1, 1.05, 0.95]);
  lijf.position.y = 1.0;
  groep.add(lijf);
  const hoofd = bol(0.7, huid);
  hoofd.position.set(0, 1.72, 0.02);
  groep.add(hoofd);

  // Gezicht (aan de voorkant, -z)
  const snuit = bol(0.34, 0xfbd5a8, [1, 0.8, 0.8]);
  snuit.position.set(0, 1.6, -0.58);
  groep.add(snuit);
  for (const x of [-0.25, 0.25]) {
    const oog = bol(0.2, 0xffffff, [1, 1.2, 0.6]);
    oog.position.set(x, 1.88, -0.58);
    groep.add(oog);
    const pupil = bol(0.1, sonic ? 0x16a34a : knuckles ? 0x7c3aed : 0x2563eb, [1, 1.2, 0.6]);
    pupil.position.set(x * 0.9, 1.88, -0.76);
    groep.add(pupil);
    const glans = new Mesh(new SphereGeometry(0.035, 10, 8), new MeshBasicMaterial({ color: 0xffffff }));
    glans.position.set(x * 0.9 - 0.03, 1.93, -0.82);
    groep.add(glans);
  }
  // Lichte buik
  const buik = bol(0.44, knuckles ? 0xfbd5a8 : sonic ? 0xfbd5a8 : 0xfff7ed, [1, 1.1, 0.55]);
  buik.position.set(0, 1.0, -0.36);
  groep.add(buik);
  const neus = bol(0.1, 0x0f172a);
  neus.position.set(0, 1.7, -0.9);
  groep.add(neus);

  // Oren en stekels / staarten
  if (knuckles) {
    // Dreadlocks achter op het hoofd en een wit halvemaantje op zijn borst
    for (const [x, y, rz] of [[-0.3, 2.0, 0.4], [0, 2.15, 0], [0.3, 2.0, -0.4]] as const) {
      const k = kegel(0.2, 0.9, huid);
      k.position.set(x, y, 0.45);
      k.rotation.set(1.1, 0, rz);
      groep.add(k);
    }
    const maan = bol(0.36, 0xffffff, [1.3, 0.55, 0.4]);
    maan.position.set(0, 1.2, -0.52);
    groep.add(maan);
  } else if (sonic) {
    for (const [x, y, z, rx, rz] of [
      [0, 1.95, -0.55, -1.0, 0],
      [-0.42, 1.78, -0.58, -0.9, 0.5],
      [0.42, 1.78, -0.58, -0.9, -0.5],
      [-0.2, 2.3, -0.1, -0.2, 0.3],
      [0.2, 2.3, -0.1, -0.2, -0.3],
      [0, 1.2, -0.7, -1.3, 0],
    ] as const) {
      const k = kegel(0.26, 0.95, huid);
      k.position.set(x, y, z);
      k.rotation.set(rx, 0, rz);
      groep.add(k);
    }
    for (const x of [-0.38, 0.38]) {
      const oor = kegel(0.18, 0.5, huid);
      oor.position.set(x, 2.35, 0.25);
      groep.add(oor);
    }
  } else {
    for (const x of [-0.42, 0.42]) {
      const oor = kegel(0.26, 0.7, huid);
      oor.position.set(x, 2.3, 0.15);
      oor.rotation.z = x > 0 ? -0.2 : 0.2;
      groep.add(oor);
      const binnen = kegel(0.1, 0.4, 0xfff7ed);
      binnen.position.set(x * 1.0, 2.28, 0.32);
      groep.add(binnen);
    }
  }

  const staarten: Mesh[] = [];
  if (!sonic) {
    for (const hoek of [0, Math.PI]) {
      const s = bol(0.3, huid, [1, 1, 2.1]);
      const punt = bol(0.28, 0xfff7ed, [0.9, 0.9, 0.9]);
      punt.position.z = -0.45;
      s.add(punt);
      s.position.set(0, 1.0, -0.95);
      s.userData.hoek = hoek;
      groep.add(s);
      staarten.push(s);
    }
  }

  // Beentjes, armen
  const benen: Mesh[] = [];
  for (const x of [-0.28, 0.28]) {
    const been = cilinder(0.15, 0.55, huid);
    been.position.set(x, 0.55, 0);
    const voet = bol(0.26, schoen, [1, 0.7, 1.5]);
    voet.position.set(0, -0.34, 0.1);
    been.add(voet);
    const band = bol(0.2, 0xffffff, [1, 0.35, 1.1]);
    band.position.set(0, -0.15, 0.08);
    been.add(band);
    // Wit bandje met een gouden gesp over de schoen
    const riem = kubus(0.42, 0.09, 0.16, 0xffffff, 0.04);
    riem.position.set(0, -0.28, -0.08);
    been.add(riem);
    const gesp = kubus(0.12, 0.1, 0.06, 0xfacc15, 0.03);
    gesp.position.set(0, -0.28, -0.17);
    been.add(gesp);
    groep.add(been);
    benen.push(been);
  }
  const armen: Mesh[] = [];
  for (const x of [-0.75, 0.75]) {
    const arm = cilinder(0.13, 0.65, huid);
    arm.position.set(x, 1.15, 0);
    const manchet = new Mesh(new TorusGeometry(0.15, 0.06, 8, 16), toon(0xffffff));
    manchet.rotation.x = Math.PI / 2;
    manchet.position.y = -0.28;
    arm.add(manchet);
    // Knuckles heeft grote vuisten met witte stekels
    const hand = bol(knuckles ? 0.34 : 0.22, knuckles ? huid : 0xffffff);
    if (knuckles) {
      for (let i = 0; i < 3; i++) {
        const sp = kegel(0.06, 0.22, 0xffffff, 0.1);
        sp.position.set((i - 1) * 0.17, -0.02, -0.3);
        sp.rotation.x = -1.4;
        hand.add(sp);
      }
    }
    hand.position.set(0, -0.4, 0);
    arm.add(hand);
    groep.add(arm);
    armen.push(arm);
  }

  const schaduw = new Mesh(new SphereGeometry(0.8, 14, 8), new MeshBasicMaterial({ color: 0x0a1540, transparent: true, opacity: 0.16 }));
  schaduw.scale.set(1, 0.05, 1);
  schaduw.position.y = 0.02;
  groep.add(schaduw);
  void licht;

  if (kleding) kleedAan(groep, kleding);

  return {
    groep,
    armen,
    hoofd,
    update(t, rent) {
      const snel = rent ? 12 : 5;
      const slag = Math.sin(t * snel);
      benen[0].rotation.x = slag * 0.9;
      benen[1].rotation.x = -slag * 0.9;
      armen[0].rotation.x = -slag * 0.8;
      armen[1].rotation.x = slag * 0.8;
      lijf.position.y = 1.0 + Math.abs(Math.sin(t * snel)) * 0.12;
      hoofd.position.y = 1.72 + Math.abs(Math.sin(t * snel)) * 0.12;
      staarten.forEach((s, i) => {
        s.rotation.z = t * 14 + i * Math.PI;
        s.rotation.x = 0.25;
      });
    },
  };
}
