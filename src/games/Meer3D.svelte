<script lang="ts">
  /**
   * 3D Meer-race (Sonic). Twee zwevende eilanden boven de zee met stapels gouden ringen (of een getal).
   * Tik het eiland met meer (of minder): Sonic springt erheen en de ringen spatten op.
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import { meerAntwoord, type MeerOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelRing } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { glitterOp } from '../ui/feest';
  import { vg } from '../store/voortgang.svelte';
  import { Brokken, Group, Mesh, Vector3, cilinder, kegel, bol, maakRenner, maakToneel, ring, vloer, type Renner, type Toneel } from '../ui/drie-d';
  import { getalPlaat, ruimOp, wolkVorm, zoekMet } from '../ui/drie-d-vormen';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  type Kant = 'links' | 'rechts';
  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<MeerOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<MeerOpgave>(opgaven as Gepland<MeerOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let goedeKant = $derived(meerAntwoord(o));
  let fout: Kant[] = $state([]);
  let vergrendeld = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();

  let vraagTekst = $derived(
    o.vorm === 'ringen' ? (o.vraag === 'meer' ? teksten.meer.meerRingen : teksten.meer.minderRingen) : o.vraag === 'meer' ? teksten.meer.groter : teksten.meer.kleiner,
  );

  const X = 5.4;
  const TOP = 1.0;
  type Eiland = { groep: Group; kant: Kant; ringen: Group; bord: Group; wiebel: number; basisY: number; vlieg: { m: Mesh; v: Vector3 }[] };
  let tn: Toneel | null = null;
  let eilanden: Eiland[] = [];
  let sonic: Renner;
  let brokken: Brokken;
  let spring: { van: Vector3; naar: Vector3; t: number; duur: number; klaar: () => void } | null = null;
  let kick = 0;

  function bouwEiland(kant: Kant): Eiland {
    const groep = new Group();
    groep.userData.kant = kant;
    groep.position.set(kant === 'links' ? -X : X, 0, 0);
    const gras = cilinder(3.3, 0.7, 0x22c55e);
    gras.position.y = TOP - 0.35;
    groep.add(gras);
    const rand = cilinder(3.45, 0.25, 0x16a34a);
    rand.position.y = TOP - 0.62;
    groep.add(rand);
    const grond = kegel(3.2, 3.2, 0x92400e);
    grond.rotation.x = Math.PI;
    grond.position.y = TOP - 2.3;
    groep.add(grond);
    // Een palmboom achter op het eiland
    const stam = cilinder(0.16, 2.6, 0x7c4a1e, 0.05);
    stam.position.set(kant === 'links' ? -2 : 2, TOP + 1.3, -1.9);
    stam.rotation.z = kant === 'links' ? 0.15 : -0.15;
    groep.add(stam);
    for (let i = 0; i < 5; i++) {
      const blad = bol(0.6, 0x15803d, [1.8, 0.25, 0.6]);
      blad.position.set(stam.position.x + Math.cos((i / 5) * Math.PI * 2) * 0.8, TOP + 2.6, -1.9 + Math.sin((i / 5) * Math.PI * 2) * 0.8);
      blad.rotation.y = (i / 5) * Math.PI * 2;
      blad.rotation.z = -0.35;
      groep.add(blad);
    }
    const ringen = new Group();
    groep.add(ringen);
    const bord = new Group();
    groep.add(bord);
    return { groep, kant, ringen, bord, wiebel: 0, basisY: 0, vlieg: [] };
  }

  /** Zet de ringen (en eventueel het getal) op de eilanden. */
  function vulEilanden(metGetal: boolean) {
    for (const e of eilanden) {
      for (const c of [...e.ringen.children]) ruimOp(c as Mesh);
      for (const c of [...e.bord.children]) ruimOp(c as Mesh);
      const n = e.kant === 'links' ? o.a : o.b;
      if (o.vorm === 'ringen' || metGetal) {
        const per = 5;
        const klein = o.vorm === 'cijfers';
        const s = klein ? 0.8 : 1.25;
        for (let i = 0; i < n; i++) {
          const r = ring(0.34 * s, 0.11 * s);
          const kol = i % per;
          const rij = Math.floor(i / per);
          r.position.set((kol - (per - 1) / 2) * 0.92 * s, TOP + 0.45 * s + rij * 0.88 * s, 0.6 - rij * 0.15);
          r.userData.fase = i * 0.4;
          r.scale.setScalar(0.01);
          r.userData.groei = i * 0.04;
          e.ringen.add(r);
        }
      }
      if (o.vorm === 'cijfers' || metGetal) {
        const g = getalPlaat(n, o.vorm === 'cijfers' ? 2.6 : 1.6);
        g.position.set(0, o.vorm === 'cijfers' ? TOP + 2.4 : TOP + 4.4, 0.8);
        e.bord.add(g);
      }
    }
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#0b5bd3', '#4fb0f5', '#c9ecff'], mist: 0xbfe6ff, mistAfstand: [30, 90], fov: 50 });
    const { scene, camera } = tn;
    const zee = vloer(null, 220, 220, 0x1d8fe0);
    zee.position.y = -3.2;
    scene.add(zee);
    const wolken: Group[] = [];
    for (let i = 0; i < 8; i++) {
      const w = wolkVorm(1.2 + (i % 3) * 0.5);
      w.position.set(-30 + i * 8.5, 8 + (i % 3) * 2.5, -22 - (i % 2) * 8);
      scene.add(w);
      wolken.push(w);
    }
    // Een klein rotsje in het midden voor Sonic
    const rots = cilinder(1.1, 1.2, 0x94a3b8);
    rots.position.set(0, -0.2, 1.2);
    scene.add(rots);

    eilanden = [bouwEiland('links'), bouwEiland('rechts')];
    for (const e of eilanden) scene.add(e.groep);
    sonic = maakRenner('sonic', vg.winkel.gekozen.held === 'super', vg.winkel.kleding.sonic);
    sonic.groep.scale.setScalar(0.85);
    sonic.groep.position.set(0, 0.4, 1.2);
    sonic.groep.rotation.y = Math.PI;
    scene.add(sonic.groep);
    brokken = new Brokken(scene, -3);

    const doel = new Vector3();
    tn.bij((dt, t) => {
      kick = Math.max(0, kick - dt * 2);
      camera.fov = 50 + kick * 7;
      camera.updateProjectionMatrix();
      camera.position.set(Math.sin(t * 0.3) * 1.6, 6.2, 15.5);
      camera.lookAt(0, 2.2, 0);
      wolken.forEach((w, i) => {
        w.position.x += dt * (0.3 + (i % 3) * 0.1);
        if (w.position.x > 40) w.position.x = -40;
      });
      for (const e of eilanden) {
        e.wiebel = Math.max(0, e.wiebel - dt * 1.5);
        e.groep.position.y = Math.sin(t * 1.1 + (e.kant === 'links' ? 0 : 1.6)) * 0.25;
        e.groep.rotation.z = Math.sin(t * 40) * 0.05 * e.wiebel;
        for (const r of e.ringen.children) {
          const g = (r.userData.groei as number) ?? 0;
          if (g > 0) r.userData.groei = g - dt;
          else if (r.scale.x < 1) r.scale.setScalar(Math.min(1, r.scale.x + dt * 6));
          r.rotation.y = Math.sin(t * 1.5 + (r.userData.fase as number)) * 0.35;
        }
        for (const b of e.bord.children) b.position.y += Math.sin(t * 2.2) * 0.003;
        for (let i = e.vlieg.length - 1; i >= 0; i--) {
          const v = e.vlieg[i];
          v.v.y -= 14 * dt;
          v.m.position.addScaledVector(v.v, dt);
          v.m.rotation.y += dt * 10;
          if (v.m.position.y < -6) {
            ruimOp(v.m);
            e.vlieg.splice(i, 1);
          }
        }
      }
      if (spring) {
        spring.t += dt;
        const f = Math.min(1, spring.t / spring.duur);
        sonic.groep.position.lerpVectors(spring.van, spring.naar, f);
        sonic.groep.position.y += Math.sin(f * Math.PI) * 3;
        sonic.groep.rotation.x = f < 1 ? f * Math.PI * 4 : 0;
        if (f >= 1) {
          const k = spring.klaar;
          spring = null;
          k();
        }
      }
      sonic.update(t, !!spring);
      brokken.update(dt);
      if (merkEl && tn) {
        doel.set(0, 3, 0);
        const p = tn.projecteer(doel);
        merkEl.style.left = `${p.x - 20}px`;
        merkEl.style.top = `${p.y - 20}px`;
      }
    });

    host.addEventListener('pointerdown', (e) => {
      if (!tn || vergrendeld || ronde.onthuld) return;
      const raak = tn.raak(e.clientX, e.clientY, eilanden.map((x) => x.groep));
      const kant = zoekMet<Kant>(raak, 'kant');
      if (kant) void kies(kant);
    });
    vulEilanden(false);
  }

  function springNaar(kant: Kant): Promise<void> {
    const e = eilanden.find((x) => x.kant === kant)!;
    return new Promise((klaar) => {
      spring = { van: sonic.groep.position.clone(), naar: new Vector3(e.groep.position.x, TOP + e.groep.position.y, 1.6), t: 0, duur: 0.6, klaar };
    });
  }

  /** De ringen op het eiland spatten omhoog. */
  function spat(kant: Kant) {
    const e = eilanden.find((x) => x.kant === kant)!;
    for (const r of [...e.ringen.children] as Mesh[]) {
      e.ringen.remove(r);
      r.position.add(e.groep.position);
      tn?.scene.add(r);
      e.vlieg.push({ m: r, v: new Vector3((Math.random() - 0.5) * 6, 7 + Math.random() * 5, (Math.random() - 0.2) * 4) });
    }
    brokken.spuit(new Vector3(e.groep.position.x, TOP + 1, 1), [0xfde047, 0xffffff, 0x38bdf8], 22, 7, 7);
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.meer.start);
      await spreek(vraagTekst);
    })();
    return () => tn?.stop();
  });

  async function kies(kant: Kant) {
    if (vergrendeld || ronde.onthuld || fout.includes(kant)) return;
    if (kant === goedeKant) {
      vergrendeld = true;
      speelGoed();
      await springNaar(kant);
      kick = 1;
      spat(kant);
      speelRing();
      glitterOp(merkEl ?? null);
      opRingen(ronde.goed(), merkEl);
      boem(merkEl, 170);
      await spreek(compliment('sonic'));
      await wacht(400);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, kant];
      eilanden.find((x) => x.kant === kant)!.wiebel = 1;
      if (ronde.fout(kant) === 'onthuld') {
        vergrendeld = true;
        vulEilanden(true);
        await springNaar(goedeKant);
        await spreek(teksten.hetIs);
        await spreek(String(goedeKant === 'links' ? o.a : o.b), 'getal');
        await wacht(900);
        volgende();
      } else {
        // Hint: nu staan de getallen (en bij getallen ook de ringen) erbij
        vulEilanden(true);
        await spreek(bijna());
        await spreek(teksten.meer.hint);
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    vergrendeld = false;
    sonic.groep.position.set(0, 0.4, 1.2);
    vulEilanden(false);
    void spreek(vraagTekst);
  }
</script>

<div class="meer">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span>{vraagTekst}</span>
    <div class="luid"><Luidspreker opTik={() => spreek(vraagTekst)} /></div>
  </div>
  <div class="pijlen">
    {#each ['links', 'rechts'] as const as k}
      <button class="pijl" class:uit={fout.includes(k)} onclick={() => kies(k)} aria-label={k === 'links' ? 'Linker eiland' : 'Rechter eiland'}>
        {k === 'links' ? '👈' : '👉'}
      </button>
    {/each}
  </div>
</div>

<style>
  .meer {
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
    font-size: 36px;
    font-weight: 700;
    z-index: 4;
  }
  .luid {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
  }
  .pijlen {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 18px;
    display: flex;
    justify-content: space-between;
    padding: 0 150px;
    z-index: 4;
    pointer-events: none;
  }
  .pijl {
    pointer-events: auto;
    width: 150px;
    height: 110px;
    border-radius: 28px;
    font-size: 70px;
    background: linear-gradient(180deg, #ffffff, #bfdbfe);
    border: 5px solid #fff;
    box-shadow: 0 8px 0 #1e40af, 0 14px 22px rgba(0, 0, 0, 0.35);
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .pijl:active {
    transform: translateY(5px);
  }
  .pijl.uit {
    filter: grayscale(1) brightness(0.65);
    opacity: 0.6;
  }
</style>
