/**
 * De getekende helden (dezelfde als in de menu's, met alles uit de kleedkamer) als figuur in de 3D-wereld.
 * Ze blijven zoals ze zijn, maar krijgen diepte:
 *  - een echte schaduw op de vloer (het silhouet werpt schaduw)
 *  - licht dat over ze heen glijdt (een lampje dat langzaam heen en weer beweegt)
 *  - een randgloed in de kleur van het podium
 *  - een lichte draai en kanteling als ze rennen, dansen of juichen
 * De figuur draait altijd naar de camera, met de voeten op de grond.
 */
import { flushSync, mount, unmount } from 'svelte';
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  TorusGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Quaternion,
  RGBADepthPacking,
  SRGBColorSpace,
  Vector3,
} from 'three';
import Held from '../art/Held.svelte';
import type { HeldId } from '../games/spellen';
import type { Kleding } from '../games/kleding';
import characters from '../../content/characters.json';
import { gloed, type Renner, type RennerKleding } from './drie-d';

const VB_B = 212;
const VB_H = 282;
/** Hoogte van de figuur in de wereld (zelfde maat als de oude blokjesfiguur). */
const HOOG = 3.0;
const BREED = (HOOG * VB_B) / VB_H;
/** De voeten staan op y = 262 van 282 in de tekening. */
const VOET = (HOOG * (VB_H - 6 - 262)) / VB_H;

const GOUD_FILTER = 'sepia(1) saturate(4.5) hue-rotate(-10deg) brightness(1.15)';

/** Teken de held (met kleding) als plaatje met doorzichtige achtergrond. */
function tekenHeld(wie: HeldId, kleding: Kleding | undefined, goud: boolean): Promise<HTMLCanvasElement> {
  const houder = document.createElement('div');
  houder.style.cssText = 'position:fixed;left:-9999px;top:0;';
  document.body.appendChild(houder);
  const comp = mount(Held, { target: houder, props: { wie, kleding, hoogte: VB_H, stemming: 'rust' } });
  flushSync();
  const svg = houder.querySelector('svg')!.cloneNode(true) as SVGSVGElement;
  unmount(comp);
  houder.remove();
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(VB_B * 2));
  svg.setAttribute('height', String(VB_H * 2));
  svg.removeAttribute('style');
  svg.removeAttribute('class');
  // De schaduw-ellips onder de voeten laten we weg: de 3D-wereld maakt een echte schaduw.
  svg.querySelector(':scope > ellipse')?.remove();
  const data = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml' }));
  return new Promise((klaar, mis) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = VB_B * 2;
      c.height = VB_H * 2;
      const g = c.getContext('2d')!;
      if (goud) g.filter = GOUD_FILTER;
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      klaar(c);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      mis(e);
    };
    img.src = url;
  });
}

/**
 * Een getekende held in 3D. Zelfde vorm als maakRenner (groep, update, armen, hoofd), zodat de spellen hem
 * zonder verdere aanpassing kunnen gebruiken. Een stoot of worp (armen[1].rotation.x) wordt een kanteling naar voren.
 */
export function maakHeld3D(
  wie: HeldId,
  goud = false,
  kleding?: RennerKleding,
  opt: { randKleur?: string | number; podium?: boolean } = {},
): Renner {
  const randKleur = opt.randKleur;
  const groep = new Group();
  const bord = new Group();
  groep.add(bord);

  // Zachte contactschaduw onder de voeten (de echte schaduw valt vaak achter de figuur)
  const contact = new Mesh(new CircleGeometry(0.85, 24), new MeshBasicMaterial({ color: 0x0a1540, transparent: true, opacity: 0.32, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.scale.set(1, 0.55, 1);
  contact.position.y = 0.03;
  groep.add(contact);

  // Een eigen podium in de kleur van de held
  if (opt.podium) {
    const kleur = new Color(randKleur ?? characters[wie].kleur);
    const voet = new Mesh(new CylinderGeometry(1.15, 1.25, 0.3, 28), new MeshLambertMaterial({ color: kleur }));
    voet.position.y = 0.15;
    voet.receiveShadow = true;
    groep.add(voet);
    const rand = new Mesh(new TorusGeometry(1.15, 0.07, 8, 32), new MeshBasicMaterial({ color: 0xfde68a }));
    rand.rotation.x = Math.PI / 2;
    rand.position.y = 0.3;
    groep.add(rand);
    bord.position.y = 0.3;
    contact.position.y = 0.31;
  }

  const geo = new PlaneGeometry(BREED, HOOG);
  geo.translate(0, HOOG / 2 - VOET, 0);

  const figuurMat = new MeshLambertMaterial({ transparent: false, alphaTest: 0.5, side: DoubleSide, color: 0xf2f2f2 });
  const figuur = new Mesh(geo, figuurMat);
  figuur.castShadow = true;
  figuur.receiveShadow = false;
  figuur.userData.schaduwKlaar = true;
  bord.add(figuur);

  // Randgloed: hetzelfde silhouet, iets groter, in één kleur, net erachter
  const randMat = new MeshBasicMaterial({ color: randKleur ?? characters[wie].kleur, alphaTest: 0.5, side: DoubleSide });
  const rand = new Mesh(geo, randMat);
  rand.scale.set(1.07, 1.035, 1);
  rand.position.z = -0.03;
  rand.userData.schaduwKlaar = true;
  bord.add(rand);
  const halo = gloed(HOOG * 1.25, randKleur ?? characters[wie].kleur, 0.45);
  halo.position.set(0, HOOG * 0.45, -0.1);
  bord.add(halo);

  // Licht dat over de figuur glijdt
  const lampje = new PointLight(0xfff1d6, 6, 5.5, 1.6);
  lampje.position.set(0, HOOG * 0.6, 1.4);
  bord.add(lampje);

  tekenHeld(wie, kleding, goud)
    .then((c) => {
      const tex = new CanvasTexture(c);
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      figuurMat.map = tex;
      figuurMat.needsUpdate = true;
      randMat.map = tex;
      randMat.needsUpdate = true;
      // Schaduw met de vorm van de figuur, niet van een rechthoek
      figuur.customDepthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: tex, alphaTest: 0.5 });
    })
    .catch(() => {
      // Tekenen mislukt: dan een gekleurd silhouet (het spel blijft werken)
      figuurMat.color.set(characters[wie].kleur);
    });

  // Nep-armen en -hoofd: de spellen zetten hier een stoot of worp op; die lezen we terug als kanteling.
  const armen = [new Mesh(), new Mesh()];
  const hoofd = new Mesh();

  // Altijd naar de camera draaien (alleen om de verticale as), los van hoe het spel de groep draait.
  const wereldPos = new Vector3();
  const ouderRot = new Quaternion();
  const draai = new Quaternion();
  const omhoog = new Vector3(0, 1, 0);
  let kanteling = 0;
  figuur.onBeforeRender = (_r, _s, camera) => {
    bord.getWorldPosition(wereldPos);
    const hoek = Math.atan2(camera.position.x - wereldPos.x, camera.position.z - wereldPos.z);
    (bord.parent as Object3D).getWorldQuaternion(ouderRot);
    draai.setFromAxisAngle(omhoog, hoek);
    bord.quaternion.copy(ouderRot.invert().multiply(draai));
    bord.rotateZ(kanteling);
  };

  return {
    groep,
    armen,
    hoofd,
    update(t, rent) {
      const stoot = Math.min(1, Math.abs(armen[0].rotation.x) + Math.abs(armen[1].rotation.x)) / 1;
      const snel = rent ? 11 : 2.2;
      // Huppelen en wiegen; bij rennen of juichen meer, bij een stoot naar voren kantelen
      const hup = rent ? Math.abs(Math.sin(t * snel)) * 0.22 : Math.sin(t * snel) * 0.03 + 0.03;
      figuur.position.y = hup;
      rand.position.y = hup;
      halo.position.y = HOOG * 0.45 + hup;
      kanteling = (rent ? Math.sin(t * snel) * 0.12 : Math.sin(t * 1.4) * 0.035) - stoot * 0.25;
      const s = 1 + (rent ? Math.sin(t * snel * 2) * 0.03 : Math.sin(t * 2.2) * 0.012);
      figuur.scale.set(1 / s, s, 1);
      // Het lampje glijdt heen en weer over de figuur
      lampje.position.x = Math.sin(t * 0.9) * BREED * 0.8;
      lampje.position.y = HOOG * (0.5 + Math.sin(t * 0.6) * 0.25);
      halo.material.opacity = 0.35 + Math.sin(t * 2) * 0.1 + stoot * 0.3;
    },
  };
}
