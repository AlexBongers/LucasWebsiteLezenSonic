<script lang="ts">
  /**
   * 3D Muur-bouwer (Knuckles). Boven de muur zweeft een plaatje, bijvoorbeeld een maan.
   * Tik de grote letterblokken in de goede volgorde: Knuckles slaat elk blok op zijn plek.
   * Staat het hele woord er, dan danst de muur!
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { BouwOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelKatapult, speelTik } from '../audio/geluid';
  import { boem, schud } from '../ui/boem';
  import { glitterOp } from '../ui/feest';
  import { vg } from '../store/voortgang.svelte';
  import {
    Brokken, Group, Mesh, Vector3, cilinder, kegel, kubus, letterTekstuur, maakRenner, maakToneel, ring, ruitTekstuur, toon, toonKaart, omlijn,
    type Renner, type Toneel,
  } from '../ui/drie-d';
  import { emojiPlaat, ruimOp } from '../ui/drie-d-vormen';
  import { BoxGeometry, CircleGeometry, MeshBasicMaterial, PlaneGeometry, type MeshToonMaterial } from 'three';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<BouwOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<BouwOpgave>(opgaven as Gepland<BouwOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let vergrendeld = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();

  const TEG = 2.1; // grootte van een blok
  const GAP = 2.5; // afstand tussen blokken
  const PALET = ['#fde68a', '#fdba74', '#bae6fd', '#bbf7d0', '#fbcfe8', '#ddd6fe', '#fecaca'];
  const ZIJKANT = [0xd6b46a, 0xd89a52, 0x8ecbe8, 0x8fd9a8, 0xe8a6c8, 0xb9a9ec, 0xe8a0a0];
  const SLOT_Y = 2.6;
  const SLOT_Z = -2.2;

  type Blok = {
    mesh: Mesh;
    letter: string;
    thuis: Vector3;
    gebruikt: boolean;
    wiebel: number;
    fout: number;
    hint: boolean;
    /** Hoogte van de plek in de muur (voor de dans). */
    vastY?: number;
    vlucht?: { van: Vector3; naar: Vector3; t: number; duur: number; klaar: () => void };
    mat: MeshToonMaterial;
  };
  type Slot = { mesh: Group; pos: Vector3; vol: boolean; gloed: number };

  let tn: Toneel | null = null;
  let blokken: Blok[] = [];
  let slots: Slot[] = [];
  let gebruikt: number[] = [];
  let plaatje: Mesh | null = null;
  let plaatjeGroep: Group | null = null;
  let muur: Group;
  let held: Renner;
  let brokken: Brokken;
  let schudden = 0;
  let stoot = 0;
  let dans = 0;
  let plaatjeSpin = 0;
  let beurt = 0;

  const geo = new BoxGeometry(TEG, TEG, TEG);
  const gevuld = () => gebruikt.length;

  function maakBlok(letter: string, i: number): Blok {
    const kleur = i % PALET.length;
    const tex = letterTekstuur(letter, PALET[kleur]);
    const mat = toonKaart(tex);
    const zij = toon(ZIJKANT[kleur]);
    // Volgorde van de zijden van een kubus: +x, -x, +y, -y, +z (voorkant), -z
    const mesh = new Mesh(geo, [zij, zij, zij, zij, mat, zij]);
    omlijn(mesh, 0.05);
    return { mesh, letter, thuis: new Vector3(), gebruikt: false, wiebel: 0, fout: 0, hint: false, mat };
  }

  function ruimBlokken() {
    for (const b of blokken) {
      muur.remove(b.mesh);
      b.mat.map?.dispose();
      b.mat.dispose();
    }
    for (const s of slots) ruimOp(s.mesh);
    if (plaatjeGroep) ruimOp(plaatjeGroep);
    blokken = [];
    slots = [];
    plaatje = null;
    plaatjeGroep = null;
    gebruikt = [];
  }

  function bouwRonde() {
    ruimBlokken();
    const n = o.tegels.length;
    // De blokken in een rij vooraan
    blokken = o.tegels.map((t, i) => maakBlok(t, i));
    blokken.forEach((b, i) => {
      b.thuis.set((i - (n - 1) / 2) * GAP, TEG / 2 + 0.05, 3.6);
      b.mesh.position.copy(b.thuis).add(new Vector3(0, 9 + i * 0.7, 0));
      b.mesh.rotation.y = (Math.random() - 0.5) * 0.2;
      muur.add(b.mesh);
    });
    // De lege plekken in de muur
    const m = o.delen.length;
    slots = o.delen.map((_, i) => {
      const g = new Group();
      const pos = new Vector3((i - (m - 1) / 2) * GAP, SLOT_Y, SLOT_Z);
      g.position.copy(pos);
      const diep = kubus(TEG + 0.15, TEG + 0.15, 0.5, 0x17303a, 0.03);
      g.add(diep);
      for (const [x, y, w, h] of [[0, (TEG + 0.15) / 2, TEG + 0.5, 0.16], [0, -(TEG + 0.15) / 2, TEG + 0.5, 0.16], [-(TEG + 0.15) / 2, 0, 0.16, TEG + 0.5], [(TEG + 0.15) / 2, 0, 0.16, TEG + 0.5]] as const) {
        const r = kubus(w, h, 0.4, 0xfacc15, 0.02);
        r.position.set(x, y, 0.1);
        g.add(r);
      }
      muur.add(g);
      return { mesh: g, pos, vol: false, gloed: 0 };
    });
    // Het plaatje boven de muur
    plaatjeGroep = new Group();
    plaatjeGroep.position.set(0, SLOT_Y + 4.6, SLOT_Z);
    const gloedschijf = new Mesh(new CircleGeometry(2.7, 28), new MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.3 }));
    gloedschijf.position.z = -0.2;
    plaatjeGroep.add(gloedschijf);
    plaatje = emojiPlaat(o.emoji, 3.8);
    plaatjeGroep.add(plaatje);
    muur.add(plaatjeGroep);
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#06263a', '#0b6b72', '#7ee0b0'], mist: 0x2a8a82, mistAfstand: [30, 85], fov: 50 });
    const { scene, camera } = tn;
    muur = new Group();
    scene.add(muur);

    const vloer = new Mesh(new PlaneGeometry(140, 140), new MeshBasicMaterial({ map: ruitTekstuur('#3f6153', '#4c7565', [34, 34]) }));
    vloer.rotation.x = -Math.PI / 2;
    scene.add(vloer);
    // Sokkel waar de muur op staat
    const sokkel = kubus(17, 0.8, 3.4, 0x64748b);
    sokkel.position.set(0, 0.4, SLOT_Z);
    scene.add(sokkel);
    const sokkel2 = kubus(18.4, 0.4, 4.4, 0x475569);
    sokkel2.position.set(0, 0.2, SLOT_Z);
    scene.add(sokkel2);

    // Een trappenpiramide met een kristal op de achtergrond
    [[26, 2.4, 14], [19, 2.4, 10.5], [12.5, 2.4, 7], [6.5, 2.4, 3.6]].forEach(([w, h, d], i) => {
      const t = kubus(w, h, d, [0x3c5a50, 0x486b5f, 0x547c6e, 0x628a7b][i], 0.02);
      t.position.set(0, h / 2 + i * h, -26);
      scene.add(t);
    });
    for (const dir of [1, -1]) {
      const kr = kegel(1.6, 3.2, 0x4ade80, 0.06);
      kr.position.set(0, 12.4 + (dir === 1 ? 1.6 : 0), -26);
      kr.rotation.x = dir === 1 ? 0 : Math.PI;
      scene.add(kr);
    }
    // Zuilen en bomen
    for (const x of [-14, -10, 10, 14]) {
      const z = cilinder(0.9, 7 + Math.abs(x % 3), 0x627d72);
      z.position.set(x, 3.6, -12 - Math.abs(x) * 0.15);
      scene.add(z);
      const top = kubus(2.4, 0.6, 2.4, 0x7a9488);
      top.position.set(x, 7.5 + Math.abs(x % 3), -12 - Math.abs(x) * 0.15);
      scene.add(top);
    }
    for (let i = 0; i < 12; i++) {
      const x = -30 + i * 5.4;
      const stam = cilinder(0.35, 4, 0x7c4a1e, 0.05);
      stam.position.set(x, 2, -17 - (i % 3) * 3);
      scene.add(stam);
      for (let k = 0; k < 3; k++) {
        const blad = kegel(2.1 - k * 0.5, 2.2, [0x15803d, 0x16a34a, 0x22c55e][k], 0.05);
        blad.position.set(x, 4.2 + k * 1.2, -17 - (i % 3) * 3);
        scene.add(blad);
      }
    }
    const ringen: Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const r = ring(0.55, 0.15);
      scene.add(r);
      ringen.push(r);
    }
    brokken = new Brokken(scene, 0.1);

    // Knuckles staat rechts van de muur, kijkt naar de blokken
    held = maakRenner('knuckles', vg.winkel.gekozen.held === 'super');
    held.groep.scale.setScalar(1.45);
    held.groep.position.set(8.6, 0.05, 2.2);
    held.groep.rotation.y = Math.PI * 0.72;
    scene.add(held.groep);

    const doel = new Vector3();
    tn.bij((dt, t) => {
      const trilling = schudden > 0 ? (Math.random() - 0.5) * schudden * 1.4 : 0;
      schudden = Math.max(0, schudden - dt);
      camera.position.set(Math.sin(t * 0.3) * 1.6 + trilling, 7.4, 14.8);
      camera.lookAt(0, 3.0, 0);
      ringen.forEach((r, i) => {
        const a = t * 0.8 + (i / ringen.length) * Math.PI * 2;
        r.position.set(Math.cos(a) * 12, 8 + Math.sin(t * 1.5 + i) * 1.4, -8 + Math.sin(a) * 4);
        r.rotation.y = t * 2;
      });

      dans = Math.max(0, dans - dt);
      for (const b of blokken) {
        if (b.vlucht) {
          const v = b.vlucht;
          v.t += dt;
          const f = Math.min(1, v.t / v.duur);
          b.mesh.position.lerpVectors(v.van, v.naar, f);
          b.mesh.position.y += Math.sin(f * Math.PI) * 4;
          b.mesh.rotation.y += dt * 8 * (1 - f);
          if (f >= 1) {
            b.mesh.rotation.set(0, 0, 0);
            const k = v.klaar;
            b.vlucht = undefined;
            k();
          }
          continue;
        }
        if (!b.gebruikt) {
          b.mesh.position.x += (b.thuis.x - b.mesh.position.x) * Math.min(1, dt * 8);
          b.mesh.position.y += (b.thuis.y - b.mesh.position.y) * Math.min(1, dt * 7);
          b.mesh.position.z += (b.thuis.z - b.mesh.position.z) * Math.min(1, dt * 8);
        }
        b.wiebel = Math.max(0, b.wiebel - dt * 1.7);
        b.fout = Math.max(0, b.fout - dt * 1.7);
        b.mesh.rotation.z = Math.sin(t * 45) * 0.16 * b.fout;
        let s = 1;
        if (b.hint && !b.gebruikt) s = 1.1 + Math.sin(t * 9) * 0.06;
        if (b.gebruikt && dans > 0) {
          const i = blokken.indexOf(b);
          b.mesh.position.y = (b.vastY ?? b.thuis.y) + Math.max(0, Math.sin(t * 9 - i * 0.7)) * 0.9 * Math.min(1, dans);
        }
        b.mesh.scale.setScalar(s);
      }
      slots.forEach((sl, i) => {
        sl.gloed = Math.max(0, sl.gloed - dt * 1.5);
        const nu = i === gevuld() && !vergrendeld && !sl.vol;
        sl.mesh.scale.setScalar(nu ? 1 + Math.sin(t * 5) * 0.035 : 1 + sl.gloed * 0.12);
      });
      if (plaatjeGroep) {
        plaatjeSpin = Math.max(0, plaatjeSpin - dt);
        plaatjeGroep.position.y = SLOT_Y + 4.6 + Math.sin(t * 1.8) * 0.18;
        plaatjeGroep.rotation.y = plaatjeSpin > 0 ? (1 - plaatjeSpin) * Math.PI * 2 : Math.sin(t * 1.2) * 0.18;
        plaatjeGroep.scale.setScalar(1 + (plaatjeSpin > 0 ? Math.sin(plaatjeSpin * Math.PI) * 0.35 : 0));
      }

      // Knuckles: rust of stoot
      held.update(t, false);
      stoot = Math.max(0, stoot - dt * 2.4);
      held.armen[1].rotation.x = -Math.sin(stoot * Math.PI) * 2.4;
      held.armen[0].rotation.x = -Math.sin(stoot * Math.PI) * 1.2;
      held.groep.position.y = 0.05 + (dans > 0 ? Math.abs(Math.sin(t * 8)) * 0.8 : 0);

      brokken.update(dt);
      if (merkEl && tn && plaatjeGroep) {
        doel.copy(plaatjeGroep.position);
        const p = tn.projecteer(doel);
        merkEl.style.left = `${p.x - 20}px`;
        merkEl.style.top = `${p.y - 20}px`;
      }
    });

    host.addEventListener('pointerdown', (e) => {
      if (!tn || vergrendeld || ronde.onthuld) return;
      const doel2 = tn.raak(e.clientX, e.clientY, blokken.filter((b) => !b.gebruikt && !b.vlucht).map((b) => b.mesh));
      const i = blokken.findIndex((b) => b.mesh === doel2 || b.mesh.children.includes(doel2 as never));
      if (i >= 0) void tik(i);
    });
    bouwRonde();
  }

  async function zegWoord() {
    await spreek(teksten.bouwen.vraag);
    await spreek(o.woord, 'woord');
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.bouwmuur.start);
      await zegWoord();
    })();
    return () => {
      beurt++;
      tn?.stop();
    };
  });

  /** Het blok vliegt naar zijn plek in de muur; Knuckles geeft er een flinke stoot tegen. */
  function plaats(i: number, slot: number): Promise<void> {
    const b = blokken[i];
    const s = slots[slot];
    b.gebruikt = true;
    b.hint = false;
    gebruikt = [...gebruikt, i];
    stoot = 1;
    speelKatapult();
    return new Promise((klaar) => {
      b.vlucht = {
        van: b.mesh.position.clone(),
        naar: new Vector3(s.pos.x, s.pos.y, s.pos.z + 0.45),
        t: 0,
        duur: 0.5,
        klaar: () => {
          s.vol = true;
          s.gloed = 1;
          b.vastY = s.pos.y;
          schudden = 0.25;
          schud(5);
          brokken.spuit(new Vector3(s.pos.x, s.pos.y - TEG / 2, s.pos.z + 1), [0xd1d5db, 0x94a3b8, 0xfbbf24, 0xffffff], 12, 4.5, 3);
          klaar();
        },
      };
    });
  }

  async function tik(i: number) {
    const b = blokken[i];
    if (vergrendeld || ronde.onthuld || b.gebruikt || b.vlucht) return;
    const nodig = o.delen[gevuld()];
    if (b.letter === nodig) {
      speelTik();
      await plaats(i, gevuld());
      if (gevuld() === o.delen.length) await klaar();
    } else {
      speelBijna();
      b.fout = 1;
      if (ronde.fout(b.letter) === 'onthuld') {
        vergrendeld = true;
        // De rest wordt voor hem gebouwd.
        for (const letter of o.delen.slice(gevuld())) {
          const n = blokken.findIndex((x, v) => x.letter === letter && !x.gebruikt && v >= 0);
          if (n >= 0) await plaats(n, gevuld());
          await wacht(120);
        }
        await spreek(o.woord, 'woord');
        await wacht(900);
        volgende();
      } else {
        // Hint: het blok dat nu moet gaat wiebelen en gloeien
        const n = blokken.findIndex((x) => x.letter === nodig && !x.gebruikt);
        if (n >= 0) blokken[n].hint = true;
        await spreek(bijna());
        await spreek(teksten.bouwen.hint);
      }
    }
  }

  async function klaar() {
    vergrendeld = true;
    speelGoed();
    dans = 2.2;
    plaatjeSpin = 1;
    brokken.spuit(plaatjeGroep!.position.clone(), [0xfde047, 0xffffff, 0xf97316, 0x4ade80], 30, 8, 8);
    glitterOp(merkEl ?? null);
    opRingen(ronde.goed(), merkEl);
    boem(merkEl, 200);
    await spreek(o.woord, 'woord');
    await spreek(compliment('knuckles'));
    await wacht(500);
    volgende();
  }

  function volgende() {
    if (!ronde.volgende()) return;
    beurt++;
    vergrendeld = false;
    bouwRonde();
    void zegWoord();
  }
</script>

<div class="muur">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span>Bouw het woord</span>
    <div class="luid"><Luidspreker opTik={zegWoord} label="Zeg het woord nog eens" /></div>
  </div>
</div>

<style>
  .muur {
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
</style>
