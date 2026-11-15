<script lang="ts">
  /**
   * 3D Rijm-raket (Knuckles). De stem zegt een woord; drie planeten dragen een plaatje.
   * Tik de planeet met het plaatje dat rijmt (kat - rat): de raket vliegt erheen en de planeet barst open in sterren.
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { RijmOpgave } from '../engine/rijm';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelWhoosh } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { glitterOp } from '../ui/feest';
  import { Brokken, Group, Mesh, Vector3, bol, cilinder, gloed, kegel, kubus, maakToneel, type Toneel } from '../ui/drie-d';
  import { emojiPlaat, ruimOp, zoekMet } from '../ui/drie-d-vormen';
  import { mijnHeld3D } from '../ui/held-3d';
  import { TorusGeometry } from 'three';
  import { toon } from '../ui/drie-d';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<RijmOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<RijmOpgave>(opgaven as Gepland<RijmOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: string[] = $state([]);
  let vergrendeld = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();

  const KLEUREN = [0x60a5fa, 0xf472b6, 0x4ade80];
  const PLEK = [new Vector3(-1.2, 3.6, -1.5), new Vector3(4.2, 4.6, -2.5), new Vector3(9.4, 3.4, -1.5)];
  type Planeet = { groep: Group; woord: string; wiebel: number; weg: number; basis: Vector3 };
  let tn: Toneel | null = null;
  let planeten: Planeet[] = [];
  let doelBord: Group | null = null;
  let raket: Group;
  let vlam: Mesh;
  let brokken: Brokken;
  let vlucht: { van: Vector3; naar: Vector3; t: number; duur: number; terug: boolean; klaar: () => void } | null = null;
  const RAKET_START = new Vector3(-7.2, 1.6, 1.5);

  function bouwRonde() {
    for (const p of planeten) ruimOp(p.groep);
    if (doelBord) ruimOp(doelBord);
    planeten = o.keuzes.map((k, i) => {
      const groep = new Group();
      groep.userData.keuze = k.woord;
      const bal = bol(1.9, KLEUREN[i]);
      groep.add(bal);
      const band = new Mesh(new TorusGeometry(2.7, 0.16, 8, 40), toon(0xfde68a, 0.3));
      band.rotation.set(1.3, 0, 0.3);
      groep.add(band);
      const kaart = emojiPlaat(k.emoji, 3.1);
      kaart.position.set(0, 0, 2.05);
      groep.add(kaart);
      groep.position.copy(PLEK[i]);
      groep.scale.setScalar(0.01);
      tn?.scene.add(groep);
      return { groep, woord: k.woord, wiebel: 0, weg: 0, basis: PLEK[i].clone() };
    });
    // Het woord dat Lucas hoort, als plaatje boven Knuckles
    doelBord = new Group();
    const schijf = cilinder(1.55, 0.2, 0xfde047);
    schijf.rotation.x = Math.PI / 2;
    doelBord.add(schijf);
    const plaatje = emojiPlaat(o.emoji, 2.4);
    plaatje.position.z = 0.2;
    doelBord.add(plaatje);
    doelBord.add(gloed(5, 0xfde68a, 0.5));
    doelBord.position.set(-7, 6.3, 0.5);
    tn?.scene.add(doelBord);
    raket.position.copy(RAKET_START);
    raket.rotation.set(0, 0, 0);
    raket.visible = true;
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#060a24', '#1e1b4b', '#5b2a86'], fov: 52, glitter: 0xffffff });
    const { scene, camera } = tn;
    // Lanceerplatform met Knuckles
    const platform = cilinder(3, 0.6, 0x475569);
    platform.position.set(-7, -0.3, 1);
    scene.add(platform);
    const knuckles = mijnHeld3D('knuckles', { podium: true });
    knuckles.groep.scale.setScalar(1.15);
    knuckles.groep.position.set(-8.6, 0, 1.2);
    scene.add(knuckles.groep);
    // Verre planeetjes en een grote maan
    for (const [x, y, z, r, k] of [[-18, 15, -30, 3, 0xf59e0b], [18, 18, -34, 4, 0x38bdf8], [28, 8, -40, 6, 0x94a3b8]] as const) {
      const p = bol(r, k, [1, 1, 1], 0.03);
      p.position.set(x, y, z);
      scene.add(p);
    }
    // De raket
    raket = new Group();
    const lijf = cilinder(0.45, 2.2, 0xf8fafc);
    raket.add(lijf);
    const neus = kegel(0.45, 0.9, 0xdc2626);
    neus.position.y = 1.55;
    raket.add(neus);
    for (const x of [-0.5, 0.5]) {
      const vin = kubus(0.4, 0.7, 0.1, 0xdc2626, 0.03);
      vin.position.set(x, -0.8, 0);
      raket.add(vin);
    }
    const raam = bol(0.22, 0x38bdf8);
    raam.position.set(0, 0.4, 0.42);
    raket.add(raam);
    vlam = kegel(0.35, 1.1, 0xfbbf24);
    vlam.rotation.x = Math.PI;
    vlam.position.y = -1.6;
    raket.add(vlam);
    scene.add(raket);
    brokken = new Brokken(scene, -20);

    tn.bij((dt, t) => {
      camera.position.set(Math.sin(t * 0.25) * 1.2, 4.5, 16);
      camera.lookAt(0, 3.6, 0);
      for (const p of planeten) {
        if (p.weg > 0) {
          p.weg = Math.max(0, p.weg - dt * 2.5);
          p.groep.scale.setScalar(Math.max(0.01, p.weg));
          continue;
        }
        if (p.groep.scale.x < 1) p.groep.scale.setScalar(Math.min(1, p.groep.scale.x + dt * 3));
        p.wiebel = Math.max(0, p.wiebel - dt * 1.5);
        p.groep.position.y = p.basis.y + Math.sin(t * 1.2 + p.basis.x) * 0.25;
        p.groep.position.x = p.basis.x + Math.sin(t * 40) * 0.2 * p.wiebel;
        p.groep.children[1].rotation.z += dt * 0.4;
      }
      if (doelBord) doelBord.position.y = 6.3 + Math.sin(t * 2) * 0.15;
      vlam.scale.y = 1 + Math.sin(t * 30) * 0.25;
      if (vlucht) {
        vlucht.t += dt;
        const f = Math.min(1, vlucht.t / vlucht.duur);
        const e = vlucht.terug ? f : f * f;
        raket.position.lerpVectors(vlucht.van, vlucht.naar, e);
        raket.position.y += Math.sin(f * Math.PI) * 2.5;
        const richting = new Vector3().subVectors(vlucht.naar, vlucht.van);
        raket.rotation.z = -Math.atan2(richting.x, richting.y + 3 * Math.cos(f * Math.PI));
        if (f >= 1) {
          const k = vlucht.klaar;
          vlucht = null;
          k();
        }
      }
      brokken.update(dt);
    });

    host.addEventListener('pointerdown', (e) => {
      if (!tn || vergrendeld || ronde.onthuld) return;
      const raak = tn.raak(e.clientX, e.clientY, planeten.map((p) => p.groep));
      const w = zoekMet<string>(raak, 'keuze');
      if (w) void kies(w);
    });
    bouwRonde();
  }

  function vlieg(naar: Vector3, duur: number, terug = false): Promise<void> {
    return new Promise((klaar) => (vlucht = { van: raket.position.clone(), naar, t: 0, duur, terug, klaar }));
  }

  function zetMerk(p: Planeet) {
    if (!merkEl || !tn) return;
    const s = tn.projecteer(p.groep.position);
    merkEl.style.left = `${s.x - 20}px`;
    merkEl.style.top = `${s.y - 20}px`;
  }

  async function vraag() {
    await spreek(teksten.rijm.vraag);
    await spreek(o.woord, 'woord');
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.rijm.start);
      await vraag();
    })();
    return () => tn?.stop();
  });

  /** De raket vliegt naar de goede planeet, die barst open in sterren. */
  async function raak(p: Planeet) {
    speelWhoosh();
    await vlieg(p.groep.position.clone().add(new Vector3(0, 0, 1)), 0.7);
    raket.visible = false;
    p.weg = 1;
    zetMerk(p);
    brokken.spuit(p.groep.position.clone(), [0xfde047, 0xffffff, KLEUREN[planeten.indexOf(p)], 0xf472b6], 34, 9, 7);
  }

  async function kies(woord: string) {
    if (vergrendeld || ronde.onthuld || fout.includes(woord)) return;
    const p = planeten.find((x) => x.woord === woord)!;
    if (woord === o.rijm) {
      vergrendeld = true;
      speelGoed();
      await raak(p);
      glitterOp(merkEl ?? null);
      opRingen(ronde.goed(), merkEl);
      boem(merkEl, 190);
      await spreek([o.woord, o.rijm], 'woord');
      await spreek(compliment('knuckles'));
      await wacht(300);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, woord];
      p.wiebel = 1;
      if (ronde.fout(woord) === 'onthuld') {
        vergrendeld = true;
        await spreek(teksten.hetIs);
        await spreek(o.rijm, 'woord');
        await raak(planeten.find((x) => x.woord === o.rijm)!);
        await wacht(900);
        volgende();
      } else {
        await spreek(bijna());
        await spreek(teksten.rijm.hint);
        await vraag();
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    vergrendeld = false;
    bouwRonde();
    void vraag();
  }
</script>

<div class="rijm">
  <div class="d3-toneel" bind:this={hostEl}></div>
  <span class="d3-merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span class="oor" aria-hidden="true">👂🎵</span>
    <div class="d3-luid"><Luidspreker opTik={vraag} /></div>
  </div>
</div>

<style>
  .rijm {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .vraag {
    position: absolute;
    left: 24px;
    top: 10px;
    padding: 8px 100px 8px 28px;
    z-index: 4;
  }
  .oor {
    font-size: 54px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
</style>
