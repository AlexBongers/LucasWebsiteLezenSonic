<script lang="ts">
  /**
   * 3D Toren-smash (Knuckles). Een toren van letterblokken. De stem zegt een woord;
   * tik op het blok met de eerste letter en Knuckles slaat het met zijn vuist uit de toren.
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { SmashOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelKatapult } from '../audio/geluid';
  import { boem, schud } from '../ui/boem';
  import {
    Brokken, Group, Mesh, Vector3, bol, cilinder, kegel, kubus, letterTekstuur, maakToneel, ring, ruitTekstuur, toonKaart,
    type Toneel,
  } from '../ui/drie-d';
  import { BoxGeometry, MeshBasicMaterial, PlaneGeometry, type MeshToonMaterial } from 'three';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<SmashOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<SmashOpgave>(opgaven as Gepland<SmashOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: string[] = $state([]);
  let bezig = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();

  const PALET = ['#fde68a', '#fdba74', '#bae6fd', '#bbf7d0', '#fbcfe8'];
  const MAAT = 3;

  type Blok = { mesh: Mesh; letter: string; doelY: number; wiebel: number; mat: MeshToonMaterial; vlucht?: { v: Vector3; w: Vector3; leven: number }; gloed: number };
  let tn: Toneel | null = null;
  let blokken: Blok[] = [];
  let toren: Group;
  let vuist: Group;
  let vuistAan = 0;
  let vuistVan = new Vector3();
  let vuistNaar = new Vector3();
  let brokken: Brokken;
  let schudden = 0;
  const geo = new BoxGeometry(MAAT, MAAT, MAAT);

  function maakBlok(letter: string, i: number): Blok {
    const tex = letterTekstuur(letter, PALET[i % PALET.length]);
    const mat = toonKaart(tex);
    const mesh = new Mesh(geo, mat);
    const rand = new Mesh(geo, new MeshBasicMaterial({ color: 0x0a1540, side: 1 }));
    rand.scale.setScalar(1.06);
    mesh.add(rand);
    mesh.rotation.y = (Math.random() - 0.5) * 0.35;
    return { mesh, letter, doelY: 0, wiebel: 0, mat, gloed: 0 };
  }

  function bouwToren() {
    for (const b of blokken) {
      toren.remove(b.mesh);
      b.mat.map?.dispose();
      b.mat.dispose();
    }
    blokken = o.keuzes.map((l, i) => maakBlok(l, i));
    blokken.forEach((b, i) => {
      b.doelY = MAAT / 2 + 0.55 + i * MAAT;
      b.mesh.position.set((Math.random() - 0.5) * 0.4, b.doelY + 16 + i * 4, 0);
      toren.add(b.mesh);
    });
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#312e81', '#7c3aed', '#f0abfc'], mist: 0xf0abfc, mistAfstand: [26, 80], fov: 50 });
    const { scene, camera } = tn;
    camera.position.set(0, 6.5, 15.5);

    const vloer = new Mesh(new PlaneGeometry(120, 120), new MeshBasicMaterial({ map: ruitTekstuur('#6d28d9', '#7c3aed', [30, 30]) }));
    vloer.rotation.x = -Math.PI / 2;
    scene.add(vloer);
    const podium = cilinder(5.2, 0.6, 0xfacc15);
    podium.position.y = 0.3;
    scene.add(podium);
    const rand = cilinder(5.6, 0.3, 0xdc2626);
    rand.position.y = 0.12;
    scene.add(rand);

    // Stenen en kristallen rond het podium
    for (let i = 0; i < 14; i++) {
      const hoek = Math.PI + (i / 13) * Math.PI;
      const afstand = 19 + (i % 3) * 3;
      const k = kegel(1 + (i % 3) * 0.5, 3 + (i % 4) * 1.4, [0x22d3ee, 0xf472b6, 0xa3e635, 0xfacc15][i % 4], 0.06);
      k.position.set(Math.cos(hoek) * afstand, 1.4 + (i % 4) * 0.5, Math.sin(hoek) * afstand * 0.8 - 4);
      k.rotation.z = (Math.random() - 0.5) * 0.5;
      scene.add(k);
    }
    const ringen: Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const r = ring(0.55, 0.15);
      scene.add(r);
      ringen.push(r);
    }

    toren = new Group();
    scene.add(toren);
    brokken = new Brokken(scene, 0.6);

    // De vuist van Knuckles
    vuist = new Group();
    const knokkel = bol(0.95, 0xdc2626);
    vuist.add(knokkel);
    for (let i = 0; i < 4; i++) {
      const sp = kegel(0.17, 0.5, 0xffffff, 0.12);
      sp.position.set(-0.55 + i * 0.37, 0.7, 0.55);
      sp.rotation.x = 0.5;
      vuist.add(sp);
    }
    const mouw = cilinder(0.7, 1.6, 0xffffff);
    mouw.rotation.x = Math.PI / 2;
    mouw.position.z = -1.2;
    vuist.add(mouw);
    vuist.visible = false;
    scene.add(vuist);

    const hulp = new Vector3();
    tn.bij((dt, t) => {
      // Camera zweeft langzaam rond de toren
      const hoek = Math.sin(t * 0.35) * 0.35;
      const trilling = schudden > 0 ? (Math.random() - 0.5) * schudden * 1.6 : 0;
      schudden = Math.max(0, schudden - dt);
      camera.position.x = Math.sin(hoek) * 15.5 + trilling;
      camera.position.z = Math.cos(hoek) * 15.5;
      camera.lookAt(0, 5, 0);
      ringen.forEach((r, i) => {
        const a = t * 0.8 + (i / ringen.length) * Math.PI * 2;
        r.position.set(Math.cos(a) * 9, 4 + Math.sin(t * 1.5 + i) * 2, -4 - Math.abs(Math.sin(a)) * 5);
        r.rotation.y = t * 2;
      });

      for (const b of blokken) {
        if (b.vlucht) {
          b.vlucht.v.y -= 22 * dt;
          b.mesh.position.addScaledVector(b.vlucht.v, dt);
          b.mesh.rotation.x += b.vlucht.w.x * dt;
          b.mesh.rotation.y += b.vlucht.w.y * dt;
          b.mesh.rotation.z += b.vlucht.w.z * dt;
          b.vlucht.leven -= dt;
          if (b.vlucht.leven < 0.5) b.mesh.scale.multiplyScalar(0.9);
          if (b.vlucht.leven <= 0) b.mesh.visible = false;
          continue;
        }
        b.mesh.position.y += (b.doelY - b.mesh.position.y) * Math.min(1, dt * 7);
        b.wiebel = Math.max(0, b.wiebel - dt * 1.6);
        b.mesh.rotation.z = Math.sin(t * 45) * 0.14 * b.wiebel;
        b.gloed = Math.max(0, b.gloed - dt);
        const puls = b.gloed > 0 ? 1.08 + Math.sin(t * 14) * 0.05 : 1;
        b.mesh.scale.setScalar(puls);
      }

      // Vuist vliegt naar het blok
      if (vuistAan > 0) {
        vuistAan = Math.max(0, vuistAan - dt);
        const f = 1 - vuistAan / 0.22;
        vuist.visible = true;
        vuist.position.lerpVectors(vuistVan, vuistNaar, Math.min(1, f * f));
        vuist.lookAt(vuistNaar.x, vuistNaar.y, vuistNaar.z - 5);
        if (vuistAan === 0) vuist.visible = false;
      }
      brokken.update(dt);

      if (merkEl && tn && blokken[0]) {
        hulp.set(0, 5, 0);
        const p = tn.projecteer(hulp);
        merkEl.style.left = `${p.x - 20}px`;
        merkEl.style.top = `${p.y - 20}px`;
      }
    });

    host.addEventListener('pointerdown', (e) => {
      if (!tn || bezig) return;
      const doel = tn.raak(e.clientX, e.clientY, blokken.filter((b) => !b.vlucht).map((b) => b.mesh));
      const i = blokken.findIndex((b) => b.mesh === doel || b.mesh.children.includes(doel as never));
      if (i >= 0) void sla(i);
    });
    bouwToren();
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.torensmash.start);
      await vraag();
    })();
    return () => tn?.stop();
  });

  async function vraag() {
    await spreek(teksten.smash.vraag);
    await spreek(o.woord, 'woord');
  }

  /** Knuckles slaat het blok uit de toren; de blokken erboven zakken naar beneden. */
  async function stoot(i: number) {
    const b = blokken[i];
    vuistVan.set(-13, 2.5, 10);
    vuistNaar.set(b.mesh.position.x - 0.6, b.mesh.position.y, 3);
    vuistAan = 0.22;
    speelKatapult();
    await wacht(200);
    schudden = 0.35;
    schud(9);
    brokken.spuit(b.mesh.position.clone(), [0xfbbf24, 0xffffff, 0xef4444, 0x94a3b8], 22, 9, 6);
    b.vlucht = { v: new Vector3(4 + Math.random() * 3, 8 + Math.random() * 3, -4), w: new Vector3(9, 11, 7), leven: 1.4 };
    // Blokken erboven zakken
    blokken.forEach((x, k) => {
      if (k > i && !x.vlucht) x.doelY -= MAAT;
    });
    if (merkEl && tn) {
      const p = tn.projecteer(b.mesh.position);
      merkEl.style.left = `${p.x - 20}px`;
      merkEl.style.top = `${p.y - 20}px`;
    }
  }

  async function sla(i: number) {
    const b = blokken[i];
    if (bezig || ronde.onthuld || fout.includes(b.letter) || b.vlucht) return;
    if (b.letter === o.letter) {
      bezig = true;
      speelGoed();
      await stoot(i);
      opRingen(ronde.goed(), merkEl);
      boem(merkEl, 190);
      await spreek(o.woord, 'woord');
      await spreek(compliment('knuckles'));
      await wacht(250);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, b.letter];
      b.wiebel = 1;
      b.mat.color.set(0x8a8a9a);
      if (ronde.fout(b.letter) === 'onthuld') {
        bezig = true;
        const juist = blokken.findIndex((x) => x.letter === o.letter);
        blokken[juist].gloed = 2.5;
        await spreek(teksten.hetIs);
        await spreek(o.woord, 'woord');
        await stoot(juist);
        await wacht(700);
        volgende();
      } else {
        await spreek(bijna());
        await spreek(teksten.smash.nogEens);
        await spreek(o.woord, 'woord');
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    bezig = false;
    bouwToren();
    void vraag();
  }
</script>

<div class="toren">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>
  {#key ronde.nummer}
    <div class="opdrachtkaart kaart">
      <span class="emoji">{o.emoji}</span>
      <div class="luid"><Luidspreker opTik={vraag} /></div>
    </div>
  {/key}
  <p class="tip">Tik op het blok met de eerste letter!</p>
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
    touch-action: none;
  }
  .merk {
    position: absolute;
    width: 40px;
    height: 40px;
    pointer-events: none;
  }
  .kaart {
    position: absolute;
    left: 24px;
    top: 10px;
    padding: 8px 96px 8px 34px;
    z-index: 4;
  }
  .emoji {
    font-size: 110px;
    line-height: 1.1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .luid {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
  }
  .tip {
    position: absolute;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    margin: 0;
    padding: 8px 26px;
    border-radius: 999px;
    background: rgba(10, 21, 64, 0.65);
    color: #fff;
    font-size: 28px;
    pointer-events: none;
    z-index: 4;
  }
</style>
