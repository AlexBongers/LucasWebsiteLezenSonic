<script lang="ts">
  /**
   * 3D Toren-boem (Tails). Blokken vallen één voor één op elkaar en de stem telt mee.
   * Hoeveel blokken zijn het? Kies het goede getal: dan ontploft de hele toren!
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { TelOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik } from '../audio/geluid';
  import { boem, schud } from '../ui/boem';
  import { Brokken, Group, Mesh, Vector3, cilinder, kubus, maakToneel, ring, ruitTekstuur, type Toneel } from '../ui/drie-d';
  import { MeshBasicMaterial, PlaneGeometry } from 'three';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<TelOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<TelOpgave>(opgaven as Gepland<TelOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let keuzes = $derived(o.keuzes ?? [o.n]);
  let fout: number[] = $state([]);
  let vergrendeld = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();

  const KLEUREN = [0xfbbf24, 0xf97316, 0xef4444, 0x3b82f6, 0x22c55e, 0xa855f7];
  const KOLOMMEN = 3;
  const AFSTAND = 1.3;
  const KNOP = ['#ef4444', '#3b82f6', '#22c55e'];

  type Steen = { mesh: Mesh; doel: Vector3; pop: number; vlucht?: { v: Vector3; w: Vector3 } };
  let tn: Toneel | null = null;
  let stenen: Steen[] = [];
  let groep: Group;
  let brokken: Brokken;
  let schudden = 0;
  let wiebel = 0;
  let ontploft = false;
  let telRonde = 0; // verhoogd als er een nieuwe telling begint; oudere tellingen stoppen dan

  const plek = (k: number) => new Vector3((k % KOLOMMEN - (KOLOMMEN - 1) / 2) * AFSTAND, 0.62 + Math.floor(k / KOLOMMEN) * AFSTAND, 0);

  function leeg() {
    for (const s of stenen) groep.remove(s.mesh);
    stenen = [];
    ontploft = false;
  }

  function voegSteen(k: number) {
    const mesh = kubus(1.15, 1.15, 1.15, KLEUREN[Math.floor(k / KOLOMMEN) % KLEUREN.length]);
    const doel = plek(k);
    mesh.position.set(doel.x, doel.y + 14, doel.z);
    groep.add(mesh);
    stenen.push({ mesh, doel, pop: 0 });
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#7c2d12', '#f97316', '#fde68a'], mist: 0xfde68a, mistAfstand: [24, 70], fov: 50 });
    const { scene, camera } = tn;
    const vloer = new Mesh(new PlaneGeometry(120, 120), new MeshBasicMaterial({ map: ruitTekstuur('#fdba74', '#fb923c', [30, 30]) }));
    vloer.rotation.x = -Math.PI / 2;
    scene.add(vloer);
    const plaat = kubus(9, 0.4, 5, 0x475569);
    plaat.position.y = 0.2;
    scene.add(plaat);
    for (const x of [-4.2, 4.2]) {
      const sl = cilinder(0.3, 6, 0xfacc15);
      sl.position.set(x, 3, -2);
      scene.add(sl);
    }
    // Gele-zwarte waarschuwingsstrepen
    for (let i = 0; i < 10; i++) {
      const s = kubus(0.9, 0.12, 0.7, i % 2 ? 0x0f172a : 0xfacc15, 0.02);
      s.position.set(-4.1 + i * 0.91, 0.46, 2.2);
      scene.add(s);
    }
    const ringen: Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const r = ring(0.5, 0.14);
      scene.add(r);
      ringen.push(r);
    }
    groep = new Group();
    scene.add(groep);
    brokken = new Brokken(scene, 0.4);
    camera.position.set(0, 6, 15);

    tn.bij((dt, t) => {
      const trilling = schudden > 0 ? (Math.random() - 0.5) * schudden * 1.6 : 0;
      schudden = Math.max(0, schudden - dt);
      camera.position.x = Math.sin(t * 0.4) * 3.2 + trilling;
      camera.position.z = 15 - Math.abs(Math.sin(t * 0.4)) * 0.8;
      camera.lookAt(0, 4, 0);
      ringen.forEach((r, i) => {
        const a = t * 0.9 + (i / ringen.length) * Math.PI * 2;
        r.position.set(Math.cos(a) * 6.2, 4 + Math.sin(t * 1.6 + i) * 1.2, Math.sin(a) * 4 - 1);
        r.rotation.y = t * 2;
      });
      wiebel = Math.max(0, wiebel - dt * 1.3);
      groep.rotation.z = Math.sin(t * 38) * 0.03 * wiebel;
      for (const s of stenen) {
        if (s.vlucht) {
          s.vlucht.v.y -= 22 * dt;
          s.mesh.position.addScaledVector(s.vlucht.v, dt);
          s.mesh.rotation.x += s.vlucht.w.x * dt;
          s.mesh.rotation.y += s.vlucht.w.y * dt;
          s.mesh.rotation.z += s.vlucht.w.z * dt;
          if (s.mesh.position.y < 0.7) {
            s.mesh.position.y = 0.7;
            s.vlucht.v.y = Math.abs(s.vlucht.v.y) * 0.4;
            s.vlucht.v.x *= 0.85;
            s.vlucht.v.z *= 0.85;
          }
          continue;
        }
        s.mesh.position.y += (s.doel.y - s.mesh.position.y) * Math.min(1, dt * 9);
        s.pop = Math.max(0, s.pop - dt * 3);
        s.mesh.scale.setScalar(1 + Math.sin(s.pop * Math.PI) * 0.35);
      }
      brokken.update(dt);
      if (merkEl && tn) {
        const p = tn.projecteer(new Vector3(0, 3, 0));
        merkEl.style.left = `${p.x - 20}px`;
        merkEl.style.top = `${p.y - 20}px`;
      }
    });
  }

  /** De stem telt de blokken hardop terwijl ze neerploffen. */
  async function bouwEnTel() {
    const ronde_ = ++telRonde;
    leeg();
    for (let k = 0; k < o.n; k++) {
      if (ronde_ !== telRonde) return;
      voegSteen(k);
      speelTik();
      await spreek(String(k + 1), 'getal');
    }
    if (ronde_ !== telRonde) return;
    await wacht(250);
    await spreek(teksten.torenboem.tel);
  }

  /** Nog eens tellen: elk blok springt even op terwijl de stem telt. */
  async function hertel() {
    const ronde_ = ++telRonde;
    for (let k = 0; k < stenen.length; k++) {
      if (ronde_ !== telRonde) return;
      stenen[k].pop = 1;
      await spreek(String(k + 1), 'getal');
    }
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.torenboem.start);
      await bouwEnTel();
    })();
    return () => {
      telRonde++;
      tn?.stop();
    };
  });

  function ontploffen() {
    ontploft = true;
    schudden = 0.6;
    schud(12);
    brokken.spuit(new Vector3(0, 2, 0), [0xfbbf24, 0xffffff, 0xef4444, 0xf97316], 34, 9, 7);
    for (const s of stenen) {
      s.vlucht = { v: new Vector3((Math.random() - 0.5) * 11, 6 + Math.random() * 8, (Math.random() - 0.3) * 8), w: new Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12) };
    }
  }

  async function kies(n: number) {
    if (vergrendeld || fout.includes(n) || ronde.onthuld) return;
    telRonde++; // stopt een telling die nog bezig is
    if (n === o.n) {
      vergrendeld = true;
      speelGoed();
      ontploffen();
      opRingen(ronde.goed(), merkEl);
      boem(merkEl, 240);
      await spreek(String(o.n), 'getal');
      await spreek(compliment('tails'));
      await wacht(900);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, n];
      wiebel = 1;
      if (ronde.fout(String(n)) === 'onthuld') {
        vergrendeld = true;
        await spreek(teksten.hetIs);
        await spreek(String(o.n), 'getal');
        await hertel();
        ontploffen();
        await wacht(1300);
        volgende();
      } else {
        await spreek(bijna());
        await spreek(teksten.torenboem.hint);
        await hertel();
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    vergrendeld = false;
    void bouwEnTel();
  }
</script>

<div class="toren">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span>Hoeveel blokken?</span>
    <div class="luid"><Luidspreker opTik={() => hertel()} label="Tel nog eens" /></div>
  </div>
  <div class="keuzes">
    {#each keuzes as k, i (k)}
      <button class="knop" class:uit={fout.includes(k)} style="--kleur:{KNOP[i % 3]}" onclick={() => kies(k)} aria-label="Antwoord {k}">
        {k}
      </button>
    {/each}
  </div>
</div>

<style>
  .toren {
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
