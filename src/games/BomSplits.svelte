<script lang="ts">
  /**
   * 3D Splits-bom (Tails). Een grote bom met een krans van ringplekken. Een deel is al gevuld;
   * hoeveel ringen moeten er nog bij? Kies het goede getal: Tails gooit de ringen erin en de bom is veilig!
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { SplitsOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelRing, speelTik } from '../audio/geluid';
  import { boem, schud } from '../ui/boem';
  import { glitterOp } from '../ui/feest';
  import { vg } from '../store/voortgang.svelte';
  import {
    Brokken, Group, Mesh, Vector3, bol, cilinder, kegel, kubus, maakRenner, maakToneel, ring, ruitTekstuur, toon,
    type Renner, type Toneel,
  } from '../ui/drie-d';
  import { vloer } from '../ui/drie-d';
  import { getalPlaat, ruimOp } from '../ui/drie-d-vormen';
  import { MeshBasicMaterial, PlaneGeometry, TorusGeometry } from 'three';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import { maakHeld3D } from '../ui/held-3d';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<SplitsOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<SplitsOpgave>(opgaven as Gepland<SplitsOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: number[] = $state([]);
  let vergrendeld = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();
  const KNOP = ['#ef4444', '#3b82f6', '#22c55e'];

  const MIDDEN = new Vector3(0, 4.7, 0);
  const STRAAL = 4.4;

  type Vlucht = { mesh: Mesh; van: Vector3; naar: Vector3; t: number; duur: number; hoogte: number; klaar: () => void };
  let tn: Toneel | null = null;
  let bom: Group;
  let lijf: Mesh;
  let lontje: Mesh;
  let mondBlij: Mesh;
  let mondBang: Mesh;
  let krans: Group;
  let plaatsen: Vector3[] = [];
  let gevuldRing: (Mesh | null)[] = [];
  let spookje: Mesh[] = [];
  let nummers: Mesh[] = [];
  let vluchten: Vlucht[] = [];
  let golven: { mesh: Mesh; t: number }[] = [];
  let tails: Renner;
  let brokken: Brokken;
  let veilig = false;
  let schudden = 0;
  let bomWiebel = 0;
  let rood = 0;
  let kick = 0;
  let springen = 0;
  let werp = 0;
  let vonkTijd = 0;
  let ringMaat = 0.45;

  const ringGeo = () => new TorusGeometry(ringMaat, ringMaat * 0.3, 10, 22);
  const hand = () => new Vector3(-6.7, 3.4 + Math.sin(performance.now() / 400) * 0.3, 3.2);

  function plek(i: number, n: number) {
    const hoek = Math.PI / 2 - (i / n) * Math.PI * 2;
    return new Vector3(MIDDEN.x + Math.cos(hoek) * STRAAL, MIDDEN.y + Math.sin(hoek) * STRAAL, 0.2);
  }

  function ruimKrans() {
    if (krans) ruimOp(krans);
    krans = new Group();
    tn?.scene.add(krans);
    plaatsen = [];
    gevuldRing = [];
    spookje = [];
    nummers = [];
    vluchten = [];
  }

  /** Bouw de krans van ringplekken: eerst de gevulde (a), daarna de lege (b). */
  function bouwKrans() {
    ruimKrans();
    const n = o.totaal;
    ringMaat = Math.min(0.8, ((2 * Math.PI * STRAAL) / n) * 0.36);
    for (let i = 0; i < n; i++) {
      const p = plek(i, n);
      plaatsen.push(p);
      if (i < o.a) {
        const r = new Mesh(ringGeo(), toon(0xfbbf24, 0.5));
        r.position.copy(p);
        krans.add(r);
        gevuldRing.push(r);
        spookje.push(r);
        r.scale.setScalar(0.01);
        r.userData.pop = i * 0.07;
      } else {
        gevuldRing.push(null);
        const s = new Mesh(new TorusGeometry(ringMaat, ringMaat * 0.12, 8, 22), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
        s.position.copy(p);
        krans.add(s);
        spookje.push(s);
      }
    }
    zetVeilig(false);
  }

  function toonNummers() {
    if (nummers.length) return;
    for (let i = o.a; i < o.totaal; i++) {
      const g = getalPlaat(i - o.a + 1, ringMaat * 2.2);
      g.position.copy(plaatsen[i]).setZ(0.8);
      krans.add(g);
      nummers.push(g);
    }
  }

  function zetVeilig(ja: boolean) {
    veilig = ja;
    lijf.material = toon(ja ? 0x16a34a : 0x1f2937);
    mondBlij.visible = ja;
    mondBang.visible = !ja;
    lontje.visible = !ja;
  }

  function vlieg(mesh: Mesh, naar: Vector3, duur = 0.5, hoogte = 2.5): Promise<void> {
    return new Promise((klaar) => {
      vluchten.push({ mesh, van: mesh.position.clone(), naar, t: 0, duur, hoogte, klaar });
    });
  }

  /** Tails gooit `aantal` ringen: de eerste komen in de lege plekken, de rest stuitert eraf. */
  async function gooi(aantal: number) {
    const gegooid: { mesh: Mesh; plek: number }[] = [];
    for (let k = 0; k < aantal; k++) {
      const i = o.a + k;
      const r = new Mesh(ringGeo(), toon(0xfbbf24, 0.5));
      r.position.copy(hand());
      tn?.scene.add(r);
      werp = 1;
      const volgend = i < o.totaal ? plaatsen[i] : new Vector3(STRAAL + 4.5 + (i - o.totaal) * 0.8, 1.2, 1.5);
      const klaar = vlieg(r, volgend.clone(), 0.42, 2.2).then(() => {
        speelRing();
        if (i < o.totaal) {
          spookje[i].visible = false;
          gevuldRing[i] = r;
          krans.add(r);
          r.position.copy(plaatsen[i]);
          gegooid.push({ mesh: r, plek: i });
        } else {
          // Te veel ringen: ze rollen weg en verdwijnen
          schudden = 0.12;
          gegooid.push({ mesh: r, plek: -1 });
        }
      });
      await wacht(170);
      if (k === aantal - 1) await klaar;
    }
    return gegooid;
  }

  /** Voor een fout getal: de ringen gaan er weer uit. */
  async function haalWeg(gegooid: { mesh: Mesh; plek: number }[]) {
    for (const g of gegooid) {
      if (g.plek >= 0) {
        spookje[g.plek].visible = true;
        gevuldRing[g.plek] = null;
      }
      g.mesh.userData.weg = 1;
      brokken.spuit(g.mesh.position.clone(), [0xfbbf24, 0xffffff], 4, 3, 3);
    }
    await wacht(450);
    for (const g of gegooid) g.mesh.parent?.remove(g.mesh);
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#2b2a7a', '#c4527f', '#ffb878'], mist: 0xffb878, mistAfstand: [32, 90], fov: 50 });
    const { scene, camera } = tn;

    scene.add(vloer(ruitTekstuur('#4b5568', '#5d6a80', [34, 34]), 140, 140));
    const sokkel = cilinder(2.9, 0.6, 0x475569);
    sokkel.position.set(0, 0.3, 0);
    scene.add(sokkel);
    const sokkelRand = cilinder(3.3, 0.3, 0xfacc15);
    sokkelRand.position.set(0, 0.12, 0);
    scene.add(sokkelRand);

    // Tandwielen en een toren op de achtergrond
    const wielen: Group[] = [];
    for (const [x, y, r, kleur] of [[-13, 7, 4.2, 0x94a3b8], [-8.2, 11.5, 2.8, 0xfb923c], [13, 8, 4.8, 0x64748b], [8.6, 13, 2.6, 0xfacc15]] as const) {
      const g = new Group();
      g.add(cilinder(r, 0.9, kleur));
      g.children[0].rotation.x = Math.PI / 2;
      for (let i = 0; i < 10; i++) {
        const hoek = (i / 10) * Math.PI * 2;
        const tand = kubus(r * 0.36, r * 0.32, 0.9, kleur, 0.04);
        tand.position.set(Math.cos(hoek) * (r + r * 0.1), Math.sin(hoek) * (r + r * 0.1), 0);
        tand.rotation.z = hoek;
        g.add(tand);
      }
      g.position.set(x, y, -16);
      scene.add(g);
      wielen.push(g);
    }
    for (const x of [-22, 22, -26, 26]) {
      const t = cilinder(1.6, 14 + Math.abs(x % 5), 0x7b6b9c);
      t.position.set(x, 7, -22);
      scene.add(t);
      const dak = kegel(2.2, 3.4, 0xef4444);
      dak.position.set(x, 15 + Math.abs(x % 5), -22);
      scene.add(dak);
    }
    brokken = new Brokken(scene, 0.05);

    // De bom: een zwart gezicht met een lontje en een metalen dop
    bom = new Group();
    bom.position.copy(MIDDEN);
    lijf = bol(2.2, 0x1f2937, [1, 1, 1], 0.04);
    bom.add(lijf);
    const dop = cilinder(0.7, 0.7, 0x94a3b8);
    dop.position.y = 2.2;
    bom.add(dop);
    const hals = cilinder(0.45, 0.5, 0x64748b);
    hals.position.y = 2.7;
    bom.add(hals);
    lontje = bol(0.3, 0xfb923c);
    lontje.position.set(0.5, 3.5, 0);
    bom.add(lontje);
    const touw = cilinder(0.09, 0.9, 0x78350f, 0.1);
    touw.position.set(0.2, 3.1, 0);
    touw.rotation.z = -0.7;
    bom.add(touw);
    for (const x of [-0.75, 0.75]) {
      const oog = bol(0.42, 0xffffff, [1, 1.15, 0.5]);
      oog.position.set(x, 0.35, 1.95);
      bom.add(oog);
      const pupil = bol(0.2, 0x0f172a, [1, 1.1, 0.5]);
      pupil.position.set(x * 0.9, 0.3, 2.28);
      bom.add(pupil);
    }
    mondBang = new Mesh(new TorusGeometry(0.5, 0.09, 8, 18, Math.PI), toon(0xffffff));
    mondBang.position.set(0, -0.65, 2.05);
    bom.add(mondBang);
    mondBlij = new Mesh(new TorusGeometry(0.62, 0.1, 8, 18, Math.PI), toon(0xffffff));
    mondBlij.rotation.z = Math.PI;
    mondBlij.position.set(0, -0.2, 2.05);
    bom.add(mondBlij);
    scene.add(bom);

    // Tails zweeft links van de bom
    tails = maakHeld3D('tails', vg.winkel.gekozen.held === 'super', vg.winkel.kleding.tails);
    tails.groep.scale.setScalar(1.6);
    tails.groep.position.set(-8.5, 1.2, 3.2);
    tails.groep.rotation.y = -Math.PI * 0.72;
    scene.add(tails.groep);

    const doel = new Vector3();
    tn.bij((dt, t) => {
      const trilling = schudden > 0 ? (Math.random() - 0.5) * schudden * 1.4 : 0;
      schudden = Math.max(0, schudden - dt);
      kick = Math.max(0, kick - dt * 2);
      camera.fov = 50 + kick * 7;
      camera.updateProjectionMatrix();
      camera.position.set(Math.sin(t * 0.3) * 2 + trilling, 6.2, 19);
      camera.lookAt(0, 4.2, 0);
      wielen.forEach((w, i) => (w.rotation.z += dt * (i % 2 ? -0.4 : 0.3)));
      // De bom wiebelt als er iets fout gaat, en kijkt blij als hij veilig is
      bomWiebel = Math.max(0, bomWiebel - dt * 1.4);
      rood = Math.max(0, rood - dt);
      bom.rotation.z = Math.sin(t * 45) * 0.06 * bomWiebel;
      bom.position.y = MIDDEN.y + (veilig ? Math.abs(Math.sin(t * 4)) * 0.25 : Math.sin(t * 2) * 0.08);
      if (rood > 0) lijf.material = toon(0xdc2626);
      else if (!veilig) lijf.material = toon(0x1f2937);
      lontje.scale.setScalar(1 + Math.sin(t * 25) * 0.25);
      vonkTijd -= dt;
      if (!veilig && vonkTijd <= 0) {
        vonkTijd = 0.12;
        brokken.spuit(new Vector3(MIDDEN.x + 0.5, MIDDEN.y + 3.5 + bom.position.y - MIDDEN.y, 0), [0xfb923c, 0xfde047, 0xffffff], 1, 1.6, 2.5);
      }

      // Ringen in de krans: opdoemen, ronddraaien
      spookje.forEach((m, i) => {
        if (!m.visible) return;
        const pop = m.userData.pop as number | undefined;
        if (pop !== undefined) {
          m.userData.pop = pop - dt;
          if (pop > 0) return;
          const s = Math.min(1, m.scale.x + dt * 5);
          m.scale.setScalar(Math.max(s, 0.01));
          if (s >= 1) m.userData.pop = undefined;
        }
        if (gevuldRing[i]) m.rotation.y = t * 2.4 + i;
        else {
          m.scale.setScalar(1 + Math.sin(t * 4 + i * 0.5) * 0.08);
        }
      });
      nummers.forEach((n, i) => (n.position.y = plaatsen[o.a + i].y + Math.sin(t * 3 + i) * 0.08));

      // Rondvliegende ringen
      for (let i = vluchten.length - 1; i >= 0; i--) {
        const v = vluchten[i];
        v.t += dt;
        const f = Math.min(1, v.t / v.duur);
        v.mesh.position.lerpVectors(v.van, v.naar, f);
        v.mesh.position.y += Math.sin(f * Math.PI) * v.hoogte;
        v.mesh.rotation.y += dt * 12;
        if (f >= 1) {
          vluchten.splice(i, 1);
          v.klaar();
        }
      }
      // Ringen die eraf moeten
      tn?.scene.traverse((x) => {
        if (x.userData.weg) {
          x.userData.weg = Math.max(0, (x.userData.weg as number) - dt * 3);
          x.scale.setScalar(Math.max(0.01, x.userData.weg as number));
        }
      });
      for (let i = golven.length - 1; i >= 0; i--) {
        const g = golven[i];
        g.t += dt;
        g.mesh.scale.setScalar(1 + g.t * 9);
        (g.mesh.material as MeshBasicMaterial).opacity = Math.max(0, 0.7 - g.t * 1.2);
        if (g.t > 0.6) {
          scene.remove(g.mesh);
          g.mesh.geometry.dispose();
          (g.mesh.material as MeshBasicMaterial).dispose();
          golven.splice(i, 1);
        }
      }

      // Tails zweeft en gooit
      werp = Math.max(0, werp - dt * 3);
      springen = Math.max(0, springen - dt);
      tails.update(t, true);
      tails.groep.position.y = 1.4 + Math.sin(t * 2.2) * 0.35 + (springen > 0 ? Math.sin(springen * 4) * 1.0 : 0);
      tails.armen[1].rotation.x = -Math.sin(werp * Math.PI) * 2.6;

      brokken.update(dt);
      if (merkEl && tn) {
        doel.copy(MIDDEN);
        const p = tn.projecteer(doel);
        merkEl.style.left = `${p.x - 20}px`;
        merkEl.style.top = `${p.y - 20}px`;
      }
    });
    bouwKrans();
  }

  async function vraag() {
    await spreek(teksten.splits.vraag1);
    await spreek(String(o.totaal), 'getal');
    await spreek(teksten.splits.vraag2);
    await spreek(String(o.a), 'getal');
    await spreek(teksten.splits.vraag3);
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.bomsplits.start);
      await vraag();
    })();
    return () => tn?.stop();
  });

  /** De bom is veilig: een lichtgolf, confetti en Tails springt op. */
  function maakVeilig() {
    zetVeilig(true);
    kick = 1;
    springen = 1.6;
    schudden = 0.2;
    const golfRing = new Mesh(new TorusGeometry(2.6, 0.18, 8, 36), new MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.7 }));
    golfRing.position.copy(MIDDEN);
    tn?.scene.add(golfRing);
    golven.push({ mesh: golfRing, t: 0 });
    brokken.spuit(MIDDEN.clone().add(new Vector3(0, 1, 2)), [0xfde047, 0xffffff, 0x4ade80, 0xf472b6], 32, 9, 8);
  }

  async function kies(b: number) {
    if (vergrendeld || ronde.onthuld || fout.includes(b)) return;
    if (b === o.b) {
      vergrendeld = true;
      speelTik();
      await gooi(o.b);
      maakVeilig();
      speelGoed();
      glitterOp(merkEl ?? null);
      opRingen(ronde.goed(), merkEl);
      boem(merkEl, 200);
      await spreek(teksten.splits.klaar);
      await spreek(compliment('tails'));
      await wacht(300);
      volgende();
    } else {
      vergrendeld = true;
      speelBijna();
      fout = [...fout, b];
      // Laat zien wat er gebeurt: te weinig ringen laat gaten, te veel ringen passen niet.
      const gegooid = await gooi(b);
      bomWiebel = 1;
      rood = 0.6;
      schudden = 0.25;
      await wacht(500);
      await haalWeg(gegooid);
      if (ronde.fout(String(b)) === 'onthuld') {
        const goed = await gooi(o.b);
        void goed;
        maakVeilig();
        await spreek(teksten.hetIs);
        await spreek(String(o.b), 'getal');
        await wacht(900);
        volgende();
      } else {
        toonNummers();
        vergrendeld = false;
        await spreek(bijna());
        await spreek(teksten.splits.hint);
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    vergrendeld = false;
    bouwKrans();
    void vraag();
  }
</script>

<div class="bom">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span>Nog hoeveel ringen?</span>
    <div class="luid"><Luidspreker opTik={() => vraag()} label="Zeg het nog eens" /></div>
  </div>
  <div class="keuzes">
    {#each o.keuzes as k, i (k)}
      <button class="knop" class:uit={fout.includes(k)} style="--kleur:{KNOP[i % 3]}" onclick={() => kies(k)} aria-label="Antwoord {k}">
        {k}
      </button>
    {/each}
  </div>
</div>

<style>
  .bom {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .toneel {
    position: absolute;
    inset: 0;
  }
  .merk {
    position: absolute;
    width: 40px;
    height: 40px;
    pointer-events: none;
  }
  .vraag {
    position: absolute;
    left: 24px;
    top: 10px;
    padding: 10px 100px 10px 32px;
    font-size: 40px;
    font-weight: 700;
    z-index: 4;
  }
  .luid {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
  }
  .keuzes {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 16px;
    display: flex;
    justify-content: center;
    gap: 34px;
    z-index: 4;
  }
  .knop {
    min-width: 230px;
    height: 118px;
    border-radius: 28px;
    border: 5px solid #fff;
    background: linear-gradient(180deg, color-mix(in srgb, var(--kleur) 80%, #fff), var(--kleur));
    box-shadow: 0 8px 0 color-mix(in srgb, var(--kleur) 50%, #000), 0 14px 22px rgba(0, 0, 0, 0.4);
    color: #fff;
    font-family: var(--font-lees);
    font-size: 86px;
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
    transition: transform 0.12s;
  }
  .knop:active {
    transform: translateY(5px);
  }
  .knop.uit {
    filter: grayscale(1) brightness(0.65);
    opacity: 0.6;
  }
</style>
