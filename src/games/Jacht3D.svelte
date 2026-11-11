<script lang="ts">
  /**
   * 3D Letter-jacht (Knuckles). Op een tempelplein zweven letterblokken op zuiltjes.
   * Sla alle blokken met de gezochte letter kapot: Knuckles geeft ze een knal en ze spatten uit elkaar.
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { JachtOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelKatapult } from '../audio/geluid';
  import { boem, schud } from '../ui/boem';
  import { vg } from '../store/voortgang.svelte';
  import {
    Brokken, Group, Mesh, Vector3, cilinder, gloed, kegel, kubus, letterTekstuur, maakRenner, maakToneel, omlijn, ring, ruitTekstuur, toon, toonKaart, vloer,
    type Renner, type Toneel,
  } from '../ui/drie-d';
  import { ruimOp, zoekMet } from '../ui/drie-d-vormen';
  import { BoxGeometry, type MeshToonMaterial, type Sprite } from 'three';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<JachtOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<JachtOpgave>(opgaven as Gepland<JachtOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let kapot: number[] = $state([]);
  let vergrendeld = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();
  let over = $derived(o.doelen.filter((i) => !kapot.includes(i)).length);

  const MAAT = 2.2;
  const PALET = ['#fde68a', '#fdba74', '#bae6fd', '#bbf7d0', '#fbcfe8', '#ddd6fe'];
  const ZIJ = [0xd6b46a, 0xd89a52, 0x8ecbe8, 0x8fd9a8, 0xe8a6c8, 0xb9a9ec];
  type Blok = { groep: Group; blok: Mesh; mat: MeshToonMaterial; thuis: Vector3; fout: number; hint: boolean; weg: number; halo: Sprite };

  let tn: Toneel | null = null;
  let veld: Group;
  let blokken: Blok[] = [];
  let knuckles: Renner;
  let brokken: Brokken;
  let stoot = 0;
  let schudden = 0;
  const geo = new BoxGeometry(MAAT, MAAT, MAAT);

  function plek(i: number, n: number) {
    const kol = 3;
    const rijen = Math.ceil(n / kol);
    const r = Math.floor(i / kol);
    const k = i % kol;
    // Achterste rijen staan hoger, zodat de letters niet achter de voorste blokken verdwijnen
    return new Vector3((k - 1) * 4.4, (rijen - 1 - r) * 1.6, (r - (rijen - 1) / 2) * 4.2 - 0.5);
  }

  function bouwVeld() {
    for (const b of blokken) {
      b.mat.map?.dispose();
      b.mat.dispose();
    }
    if (veld) ruimOp(veld);
    veld = new Group();
    tn?.scene.add(veld);
    blokken = o.tegels.map((letter, i) => {
      const groep = new Group();
      const thuis = plek(i, o.tegels.length);
      groep.position.copy(thuis);
      groep.userData.blok = i;
      const hoog = thuis.y;
      const zuil = cilinder(0.55, 1.4 + hoog, 0x7a9488);
      zuil.position.y = (1.4 - hoog) / 2;
      groep.add(zuil);
      const kap = cilinder(0.8, 0.2, 0x94a3b8);
      kap.position.y = 1.45;
      groep.add(kap);
      const kleur = i % PALET.length;
      const mat = toonKaart(letterTekstuur(letter, PALET[kleur]));
      const zij = toon(ZIJ[kleur]);
      const blok = omlijn(new Mesh(geo, [zij, zij, zij, zij, mat, zij]), 0.05);
      blok.position.y = 1.55 + MAAT / 2 + 0.25;
      blok.scale.setScalar(0.01);
      groep.add(blok);
      const halo = gloed(MAAT * 2.4, 0xfde047, 0);
      halo.position.copy(blok.position);
      groep.add(halo);
      veld.add(groep);
      return { groep, blok, mat, thuis, fout: 0, hint: false, weg: 0, halo };
    });
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#0b2440', '#1b6a72', '#8ee3b8'], mist: 0x2a8a82, mistAfstand: [28, 80], fov: 50, glitter: 0xbbf7d0 });
    const { scene, camera } = tn;
    scene.add(vloer(ruitTekstuur('#3f6153', '#4c7565', [34, 34]), 140, 140));
    // Tempel en bomen op de achtergrond
    [[24, 2.2, 10], [18, 2.2, 8], [12, 2.2, 6], [6, 2.2, 4]].forEach(([w, h, d], i) => {
      const t = kubus(w, h, d, [0x3c5a50, 0x486b5f, 0x547c6e, 0x628a7b][i], 0.02);
      t.position.set(0, h / 2 + i * h, -22);
      scene.add(t);
    });
    const kristal = kegel(1.4, 3, 0x4ade80, 0.06);
    kristal.position.set(0, 10.6, -22);
    scene.add(kristal);
    const kristalGloed = gloed(7, 0x4ade80, 0.6);
    kristalGloed.position.set(0, 10.6, -21);
    scene.add(kristalGloed);
    for (let i = 0; i < 12; i++) {
      const x = -30 + i * 5.4;
      if (Math.abs(x) < 9) continue;
      for (let k = 0; k < 3; k++) {
        const blad = kegel(2.1 - k * 0.5, 2.2, [0x15803d, 0x16a34a, 0x22c55e][k], 0.05);
        blad.position.set(x, 2.4 + k * 1.2, -14 - (i % 3) * 3);
        scene.add(blad);
      }
    }
    const ringen: Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const r = ring(0.5, 0.14);
      scene.add(r);
      ringen.push(r);
    }
    brokken = new Brokken(scene, 0.05);
    knuckles = maakRenner('knuckles', vg.winkel.gekozen.held === 'super', vg.winkel.kleding.knuckles);
    knuckles.groep.scale.setScalar(1.4);
    knuckles.groep.position.set(9.6, 0, -1.5);
    knuckles.groep.rotation.y = Math.PI * 0.75;
    scene.add(knuckles.groep);

    tn.bij((dt, t) => {
      const tril = schudden > 0 ? (Math.random() - 0.5) * schudden * 1.2 : 0;
      schudden = Math.max(0, schudden - dt);
      camera.position.set(Math.sin(t * 0.3) * 1.2 + tril, 10.5, 10.5);
      camera.lookAt(0, 1.8, -1.2);
      ringen.forEach((r, i) => {
        const a = t * 0.7 + (i / ringen.length) * Math.PI * 2;
        r.position.set(Math.cos(a) * 12, 7 + Math.sin(t * 1.4 + i), -9 + Math.sin(a) * 3);
        r.rotation.y = t * 2;
      });
      blokken.forEach((b, i) => {
        if (b.weg > 0) {
          b.weg = Math.max(0, b.weg - dt * 3);
          b.blok.scale.setScalar(Math.max(0.01, b.weg));
          b.blok.rotation.y += dt * 14;
          b.blok.position.y += dt * 3;
          if (b.weg === 0) b.blok.visible = false;
          return;
        }
        if (!b.blok.visible) return;
        if (b.blok.scale.x < 1) b.blok.scale.setScalar(Math.min(1, b.blok.scale.x + dt * 4));
        b.fout = Math.max(0, b.fout - dt * 1.6);
        b.blok.rotation.z = Math.sin(t * 45) * 0.15 * b.fout;
        b.blok.rotation.y = Math.sin(t * 0.8 + i) * 0.18;
        b.blok.position.y = 1.55 + MAAT / 2 + 0.25 + Math.sin(t * 1.6 + i * 0.9) * 0.15;
        b.halo.position.y = b.blok.position.y;
        b.halo.material.opacity = b.hint ? 0.45 + Math.sin(t * 6) * 0.25 : 0;
      });
      stoot = Math.max(0, stoot - dt * 2.6);
      knuckles.update(t, false);
      knuckles.armen[1].rotation.x = -Math.sin(stoot * Math.PI) * 2.5;
      knuckles.groep.position.y = stoot > 0 ? Math.sin(stoot * Math.PI) * 0.4 : 0;
      brokken.update(dt);
    });

    host.addEventListener('pointerdown', (e) => {
      if (!tn || vergrendeld) return;
      const raak = tn.raak(e.clientX, e.clientY, blokken.filter((b) => b.blok.visible && b.weg === 0).map((b) => b.groep));
      const i = zoekMet<number>(raak, 'blok');
      if (i !== undefined) void sla(i);
    });
    bouwVeld();
  }

  function zetMerk(i: number) {
    if (!merkEl || !tn) return;
    const b = blokken[i];
    const p = tn.projecteer(b.groep.position.clone().add(b.blok.position));
    merkEl.style.left = `${p.x - 20}px`;
    merkEl.style.top = `${p.y - 20}px`;
  }

  /** Knal: het blok spat uit elkaar. */
  function knal(i: number) {
    const b = blokken[i];
    stoot = 1;
    speelKatapult();
    b.weg = 1;
    b.hint = false;
    schudden = 0.2;
    zetMerk(i);
    boem(merkEl, 150);
    brokken.spuit(b.groep.position.clone().add(b.blok.position), [0xfbbf24, 0xffffff, ZIJ[i % ZIJ.length], 0x94a3b8], 18, 7, 6);
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.jacht.start);
      await vraag();
    })();
    return () => tn?.stop();
  });

  async function vraag() {
    await spreek(teksten.jacht.vraag);
    await spreek(o.woord, 'woord');
  }

  async function sla(i: number) {
    if (vergrendeld || kapot.includes(i)) return;
    if (o.doelen.includes(i)) {
      kapot = [...kapot, i];
      knal(i);
      if (o.doelen.every((d) => kapot.includes(d))) await klaar();
    } else {
      speelBijna();
      blokken[i].fout = 1;
      if (ronde.fout(o.tegels[i]) === 'onthuld') {
        vergrendeld = true;
        for (const d of o.doelen.filter((x) => !kapot.includes(x))) {
          kapot = [...kapot, d];
          knal(d);
          await wacht(380);
        }
        await spreek(teksten.hetIs);
        await spreek(o.woord, 'woord');
        await wacht(800);
        volgende();
      } else {
        for (const d of o.doelen) if (!kapot.includes(d)) blokken[d].hint = true;
        await spreek(bijna());
        await spreek(teksten.jacht.hint);
      }
    }
  }

  async function klaar() {
    vergrendeld = true;
    speelGoed();
    schud(8);
    opRingen(ronde.goed(), merkEl);
    await spreek(teksten.jacht.klaar);
    await spreek(compliment('knuckles'));
    await wacht(300);
    volgende();
  }

  function volgende() {
    if (!ronde.volgende()) return;
    kapot = [];
    vergrendeld = false;
    bouwVeld();
    void vraag();
  }
</script>

<div class="jacht">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span class="zoek">Zoek</span>
    <span class="letter">{o.letter}</span>
    <span class="emoji">{o.emoji}</span>
    <span class="over">nog {over}</span>
    <div class="luid"><Luidspreker opTik={vraag} /></div>
  </div>
</div>

<style>
  .jacht {
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
    display: flex;
    flex-direction: row;
    white-space: nowrap;
    align-items: center;
    gap: 18px;
    padding: 6px 100px 6px 28px;
    z-index: 4;
  }
  .zoek {
    font-size: 34px;
    font-weight: 700;
  }
  .letter {
    font-family: var(--font-lees);
    font-size: 72px;
    font-weight: 700;
    line-height: 1;
    color: #fde68a;
  }
  .emoji {
    font-size: 54px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .over {
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 24px;
    font-weight: 700;
    background: rgba(220, 38, 38, 0.7);
  }
  .luid {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
  }
</style>
