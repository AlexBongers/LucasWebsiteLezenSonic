<script lang="ts">
  /**
   * 3D Patroon-baan (Sonic). Een zwevende baan van platforms met een patroon erop (rood, blauw, rood, blauw, …).
   * Sonic rent er één keer overheen. Wat komt er op het laatste platform? Kies het goede plaatje en hij rent door!
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { PatroonOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { glitterOp } from '../ui/feest';
  import { vg } from '../store/voortgang.svelte';
  import {
    Brokken, Group, Mesh, Vector3, cilinder, kubus, maakRenner, maakToneel, ring, toon,
    type Renner, type Toneel,
  } from '../ui/drie-d';
  import { SphereGeometry, TorusGeometry } from 'three';
  import { patroonSymbool, ruimOp, vraagPlaat, wolkVorm } from '../ui/drie-d-vormen';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<PatroonOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<PatroonOpgave>(opgaven as Gepland<PatroonOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: string[] = $state([]);
  let vergrendeld = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();

  type Pad = { groep: Group; symbool?: Group; basis: Vector3; flits: number; puls: boolean };
  let tn: Toneel | null = null;
  let baan: Group | null = null;
  let pads: Pad[] = [];
  let vraagTeken: Mesh | null = null;
  let sonic: Renner;
  let brokken: Brokken;
  let spring: { van: Vector3; naar: Vector3; t: number; duur: number; hoogte: number; klaar: () => void } | null = null;
  let sonicNaar = 0; // kijkrichting: 1 = naar rechts
  let afstand = 12;
  let kick = 0;
  let schudden = 0;
  let vraagSchud = 0;
  let beurt = 0; // verhoogd bij een nieuwe ronde: oudere filmpjes stoppen dan

  const MAAT = 0.8; // Sonic is zo groot t.o.v. de platforms
  const SYM = 1.3; // en de plaatjes op de platforms
  const padPos = (i: number, n: number) => {
    const span = Math.min(17, 2.5 * (n - 1));
    const f = n > 1 ? i / (n - 1) : 0.5;
    return new Vector3((f - 0.5) * span, 0.35 + i * 0.1, -Math.sin(f * Math.PI) * 1.6);
  };
  const bovenOp = (p: Vector3) => new Vector3(p.x, p.y + 0.3, p.z);

  function ruimBaanOp() {
    if (baan) ruimOp(baan);
    baan = null;
    pads = [];
    vraagTeken = null;
  }

  function bouwBaan() {
    if (!tn) return;
    ruimBaanOp();
    baan = new Group();
    tn.scene.add(baan);
    const n = o.reeks.length + 1;
    afstand = 9 + Math.min(17, 2.5 * (n - 1)) * 0.3;

    for (let i = 0; i < n; i++) {
      const basis = padPos(i, n);
      const groep = new Group();
      groep.position.copy(basis);
      const laatste = i === n - 1;
      const plaat = cilinder(0.95, 0.36, laatste ? 0xfacc15 : i % 2 ? 0xe0f2fe : 0xbae6fd);
      groep.add(plaat);
      const rand = new Mesh(new TorusGeometry(0.88, 0.07, 8, 24), toon(laatste ? 0xf59e0b : 0x38bdf8, 0.4));
      rand.rotation.x = Math.PI / 2;
      rand.position.y = 0.2;
      groep.add(rand);
      // Een lint naar het volgende platform
      if (!laatste) {
        const naar = padPos(i + 1, n);
        const lengte = basis.distanceTo(naar);
        const lint = kubus(lengte * 0.7, 0.12, 0.6, 0x1d4ed8, 0.04);
        lint.position.set((naar.x - basis.x) / 2, (naar.y - basis.y) / 2 - 0.05, (naar.z - basis.z) / 2);
        const dx = naar.x - basis.x;
        const dz = naar.z - basis.z;
        lint.rotation.order = 'YZX';
        lint.rotation.y = -Math.atan2(dz, dx);
        lint.rotation.z = Math.atan2(naar.y - basis.y, Math.hypot(dx, dz));
        groep.add(lint);
      }
      const pad: Pad = { groep, basis, flits: 0, puls: false };
      if (!laatste) {
        const sym = patroonSymbool(o.reeks[i]);
        sym.position.y = 1.4;
        sym.scale.setScalar(SYM);
        groep.add(sym);
        pad.symbool = sym;
      } else {
        const v = vraagPlaat(1.7);
        v.position.y = 1.45;
        groep.add(v);
        vraagTeken = v;
      }
      baan.add(groep);
      pads.push(pad);
    }
    // Sonic wacht links van het eerste platform
    const start = bovenOp(pads[0].basis).add(new Vector3(-2.5, 0, 0));
    sonic.groep.position.copy(start);
    sonic.groep.scale.setScalar(MAAT);
    sonicNaar = 1;
  }

  function hop(naar: Vector3, duur = 0.34, hoogte = 0.9): Promise<void> {
    return new Promise((klaar) => {
      spring = { van: sonic.groep.position.clone(), naar, t: 0, duur, hoogte, klaar };
    });
  }

  /** Sonic rent één keer over het patroon: elk platform licht even op. */
  async function loopOverBaan() {
    const mijn = beurt;
    sonic.groep.position.copy(bovenOp(pads[0].basis).add(new Vector3(-2.5, 0, 0)));
    await wacht(350);
    for (let i = 0; i < pads.length - 1; i++) {
      if (mijn !== beurt) return;
      await hop(bovenOp(pads[i].basis), 0.3, 0.7);
      pads[i].flits = 1;
      speelTik();
    }
    if (mijn === beurt) await wacht(250);
  }

  async function vraag() {
    await loopOverBaan();
    await spreek(teksten.patroon.vraag);
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#1d6fd8', '#58b6f5', '#d8f0ff'], mist: 0xcfeaff, mistAfstand: [30, 90], fov: 48 });
    const { scene, camera } = tn;

    // Zon en wolken
    const zon = new Mesh(new SphereGeometry(2.6, 22, 16), toon(0xfde047, 1));
    zon.position.set(15, 11, -34);
    scene.add(zon);
    const wolken: Group[] = [];
    for (let i = 0; i < 9; i++) {
      const w = wolkVorm(1.1 + (i % 3) * 0.55);
      w.position.set(-26 + i * 6.5, -2.5 - (i % 3) * 1.6, -9 - (i % 2) * 6);
      scene.add(w);
      wolken.push(w);
    }
    for (let i = 0; i < 5; i++) {
      const w = wolkVorm(1.5);
      w.position.set(-20 + i * 11, 9 + (i % 2) * 2, -22);
      scene.add(w);
      wolken.push(w);
    }
    const zwevend: Mesh[] = [];
    for (let i = 0; i < 7; i++) {
      const r = ring(0.55, 0.15);
      scene.add(r);
      zwevend.push(r);
    }

    sonic = maakRenner('sonic', vg.winkel.gekozen.held === 'super', vg.winkel.kleding.sonic);
    sonic.groep.rotation.y = -Math.PI / 2;
    scene.add(sonic.groep);
    brokken = new Brokken(scene, -50);

    const doel = new Vector3();
    tn.bij((dt, t) => {
      const trilling = schudden > 0 ? (Math.random() - 0.5) * schudden * 1.4 : 0;
      schudden = Math.max(0, schudden - dt);
      kick = Math.max(0, kick - dt * 2.2);
      camera.fov = 48 + kick * 8;
      camera.updateProjectionMatrix();
      camera.position.set(Math.sin(t * 0.3) * 1.4 + trilling, 5.6 + Math.sin(t * 0.4) * 0.3, afstand);
      camera.lookAt(0, 0.4, -1);

      wolken.forEach((w, i) => (w.position.x += dt * (0.25 + (i % 3) * 0.12)));
      wolken.forEach((w) => {
        if (w.position.x > 34) w.position.x = -34;
      });
      zwevend.forEach((r, i) => {
        const a = t * 0.7 + (i / zwevend.length) * Math.PI * 2;
        r.position.set(Math.cos(a) * 11, 6.5 + Math.sin(t * 1.4 + i) * 0.8, -6 + Math.sin(a) * 3);
        r.rotation.y = t * 2;
      });

      // Platforms: opveren bij een flits, symbolen draaien en zweven
      pads.forEach((p, i) => {
        p.flits = Math.max(0, p.flits - dt * 2.6);
        p.groep.position.y = p.basis.y - Math.sin(p.flits * Math.PI) * 0.18;
        if (p.symbool) {
          p.symbool.rotation.y = Math.sin(t * 1.4 + i) * 0.55;
          const veer = p.flits > 0 ? 1 + Math.sin(p.flits * Math.PI) * 0.35 : p.puls ? 1 + Math.sin(t * 8) * 0.12 : 1;
          p.symbool.scale.setScalar(veer * SYM);
          p.symbool.position.y = 1.4 + Math.sin(t * 2 + i * 0.7) * 0.1 + (p.flits > 0 ? Math.sin(p.flits * Math.PI) * 0.4 : 0);
        }
      });
      if (vraagTeken) {
        vraagSchud = Math.max(0, vraagSchud - dt);
        vraagTeken.rotation.y = Math.sin(t * 2) * 0.25;
        vraagTeken.position.y = 1.45 + Math.sin(t * 2.4) * 0.14;
        vraagTeken.position.x = Math.sin(t * 60) * 0.15 * vraagSchud;
        const puls = 1 + Math.sin(t * 5) * 0.06;
        vraagTeken.scale.setScalar(puls);
      }

      // Sonic springt van platform naar platform
      if (spring) {
        spring.t += dt;
        const f = Math.min(1, spring.t / spring.duur);
        sonic.groep.position.lerpVectors(spring.van, spring.naar, f);
        sonic.groep.position.y += Math.sin(f * Math.PI) * spring.hoogte;
        if (f >= 1) {
          const k = spring.klaar;
          spring = null;
          k();
        }
      }
      sonic.update(t, !!spring);
      sonic.groep.rotation.y = -Math.PI / 2 * sonicNaar;

      brokken.update(dt);
      if (merkEl && tn && pads.length) {
        doel.copy(pads[pads.length - 1].basis).setY(pads[pads.length - 1].basis.y + 1.2);
        const p = tn.projecteer(doel);
        merkEl.style.left = `${p.x - 20}px`;
        merkEl.style.top = `${p.y - 20}px`;
      }
    });
    bouwBaan();
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.patroonbaan.start);
      await vraag();
    })();
    return () => {
      beurt++;
      tn?.stop();
    };
  });

  /** Het gekozen plaatje komt op het laatste platform te staan. */
  function leg(emoji: string) {
    const laatste = pads[pads.length - 1];
    if (vraagTeken) {
      ruimOp(vraagTeken);
      vraagTeken = null;
    }
    const sym = patroonSymbool(emoji);
    sym.position.y = 1.4;
    sym.scale.setScalar(0.01);
    laatste.groep.add(sym);
    laatste.symbool = sym;
    // Laat het symbool opploppen
    laatste.flits = 1;
  }

  async function rendWeg() {
    const laatste = pads[pads.length - 1];
    await hop(bovenOp(laatste.basis).add(new Vector3(16, 1.5, 0)), 0.6, 1.5);
  }

  /** Stopt de loop van Sonic over het patroon (als Lucas al wil antwoorden). */
  function stopLoop() {
    beurt++;
    if (spring) {
      const k = spring.klaar;
      spring = null;
      k();
    }
  }

  async function kies(k: string) {
    if (vergrendeld || ronde.onthuld || fout.includes(k)) return;
    stopLoop();
    const laatste = pads[pads.length - 1];
    if (k === o.antwoord) {
      vergrendeld = true;
      speelGoed();
      leg(k);
      await hop(bovenOp(laatste.basis), 0.4, 1.1);
      kick = 1;
      schudden = 0.25;
      brokken.spuit(bovenOp(laatste.basis).add(new Vector3(0, 0.6, 0)), [0xfde047, 0xffffff, 0x38bdf8, 0xf472b6], 22, 6, 6);
      glitterOp(merkEl ?? null);
      opRingen(ronde.goed(), merkEl);
      boem(merkEl, 190);
      await spreek(compliment('sonic'));
      await rendWeg();
      await wacht(150);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, k];
      vraagSchud = 0.5;
      if (ronde.fout(k) === 'onthuld') {
        vergrendeld = true;
        await spreek(teksten.hetIs);
        leg(o.antwoord);
        await hop(bovenOp(laatste.basis), 0.4, 1.1);
        await wacht(1100);
        volgende();
      } else {
        pads.forEach((p, i) => (p.puls = i < o.vorm.length));
        await spreek(bijna());
        await spreek(teksten.patroon.hint);
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    beurt++;
    fout = [];
    vergrendeld = false;
    bouwBaan();
    void vraag();
  }

  function nogEens() {
    if (vergrendeld) return;
    stopLoop();
    void vraag();
  }
</script>

<div class="baan">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span>Wat komt hierna?</span>
    <div class="luid"><Luidspreker opTik={nogEens} label="Kijk nog eens" /></div>
  </div>
  <div class="keuzes">
    {#each o.keuzes as k, i (k)}
      <button class="knop" class:uit={fout.includes(k)} style="animation-delay:{i * 0.1}s" onclick={() => kies(k)} aria-label="Plaatje {i + 1}">{k}</button>
    {/each}
  </div>
</div>

<style>
  .baan {
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
    width: 200px;
    height: 160px;
    border-radius: 30px;
    border: 5px solid #fff;
    background: linear-gradient(180deg, #ffffff, #bfdbfe);
    box-shadow: 0 8px 0 #1e40af, 0 14px 22px rgba(0, 0, 0, 0.35);
    font-size: 100px;
    line-height: 1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
    animation: pop-in 0.4s ease-out backwards;
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
