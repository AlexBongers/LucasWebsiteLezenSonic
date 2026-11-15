<script lang="ts">
  /**
   * 3D Getallenbaan (Tails). Een rij zwevende tegels met getallen; op één tegel staat een vraagteken.
   * Welk getal komt erna, ervoor, of mist er? Bij het goede getal vliegt Tails tegel voor tegel naar de plek.
   * Bij een fout tellen de tegels hardop mee.
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { BaanOpgave } from '../engine/getallenlijn';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { glitterOp } from '../ui/feest';
  import { Brokken, Group, Vector3, kubus, maakToneel, ring, ruitTekstuur, vloer, type Renner, type Toneel } from '../ui/drie-d';
  import { getalPlaat, ruimOp, wolkVorm } from '../ui/drie-d-vormen';
  import { mijnHeld3D } from '../ui/held-3d';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<BaanOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<BaanOpgave>(opgaven as Gepland<BaanOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  let fout: number[] = $state([]);
  let vergrendeld = $state(false);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();
  const KNOP = ['#ef4444', '#3b82f6', '#22c55e'];
  const TEGEL_KLEUR = [0xfde68a, 0xbae6fd, 0xbbf7d0, 0xfbcfe8, 0xddd6fe, 0xfed7aa];

  type Tegel = { groep: Group; basis: Vector3; flits: number; schud: number };
  let tn: Toneel | null = null;
  let baan: Group | null = null;
  let tegels: Tegel[] = [];
  let tails: Renner;
  let brokken: Brokken;
  let doelPos = new Vector3();
  let beurt = 0;

  const tegelPos = (i: number) => new Vector3(-7.5 + i * 3, 1.2 + i * 0.25, 0);

  function zetGetal(t: Tegel, tekst: string | number, kleur = '#fde047') {
    const oud = t.groep.getObjectByName('getal');
    if (oud) ruimOp(oud as never);
    const g = getalPlaat(tekst, 2, kleur);
    g.name = 'getal';
    g.position.set(0, 1.9, 0.2);
    t.groep.add(g);
  }

  function bouwBaan() {
    if (baan) ruimOp(baan);
    baan = new Group();
    tn?.scene.add(baan);
    tegels = o.rij.map((n, i) => {
      const groep = new Group();
      const basis = tegelPos(i);
      groep.position.copy(basis);
      groep.add(kubus(2.4, 0.5, 2.2, i === o.gat ? 0xfacc15 : TEGEL_KLEUR[i % TEGEL_KLEUR.length]));
      baan!.add(groep);
      const t: Tegel = { groep, basis, flits: 0, schud: 0 };
      zetGetal(t, i === o.gat ? '?' : n, i === o.gat ? '#fde68a' : '#ffffff');
      return t;
    });
    // Tails wacht links naast de baan, zodat hij geen getal bedekt
    tails.groep.position.copy(tegelPos(-1)).add(new Vector3(-0.4, 0.4, 0.6));
    doelPos = tegelPos(o.gat);
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#2b2a7a', '#c4527f', '#ffb878'], mist: 0xffb878, mistAfstand: [34, 90], fov: 50 });
    const { scene, camera } = tn;
    const grond = vloer(ruitTekstuur('#4b5568', '#5d6a80', [30, 30]), 140, 140);
    grond.position.y = -4;
    scene.add(grond);
    const wolken: Group[] = [];
    for (let i = 0; i < 7; i++) {
      const w = wolkVorm(1 + (i % 3) * 0.4, 0xffe4e6);
      w.position.set(-24 + i * 8, -2.4 + (i % 2), -6 - (i % 3) * 4);
      scene.add(w);
      wolken.push(w);
    }
    const ringen = Array.from({ length: 6 }, (_, i) => {
      const r = ring(0.5, 0.14);
      r.position.set(-12 + i * 5, 7 + (i % 2) * 1.5, -6);
      scene.add(r);
      return r;
    });
    tails = mijnHeld3D('tails');
    tails.groep.scale.setScalar(0.85);
    scene.add(tails.groep);
    brokken = new Brokken(scene, -4);

    const hulp = new Vector3();
    tn.bij((dt, t) => {
      camera.position.set(Math.sin(t * 0.3) * 1.2, 5.2, 15.5);
      camera.lookAt(0, 2.4, 0);
      wolken.forEach((w) => {
        w.position.x += dt * 0.5;
        if (w.position.x > 30) w.position.x = -30;
      });
      ringen.forEach((r, i) => (r.rotation.y = t * 2 + i));
      tegels.forEach((tg, i) => {
        tg.flits = Math.max(0, tg.flits - dt * 2.5);
        tg.schud = Math.max(0, tg.schud - dt * 1.5);
        tg.groep.position.y = tg.basis.y + Math.sin(t * 1.4 + i * 0.6) * 0.12 + Math.sin(tg.flits * Math.PI) * 0.45;
        tg.groep.position.x = tg.basis.x + Math.sin(t * 45) * 0.18 * tg.schud;
        if (i === o.gat && !vergrendeld) tg.groep.scale.setScalar(1 + Math.sin(t * 5) * 0.05);
        else tg.groep.scale.setScalar(1);
      });
      tails.update(t, true);
      brokken.update(dt);
      if (merkEl && tn) {
        hulp.copy(doelPos).setY(doelPos.y + 1.9);
        const p = tn.projecteer(hulp);
        merkEl.style.left = `${p.x - 20}px`;
        merkEl.style.top = `${p.y - 20}px`;
      }
    });
    bouwBaan();
  }

  /** Tails vliegt van tegel naar tegel tot de tegel met het vraagteken. */
  async function vliegNaarGat() {
    const mijn = beurt;
    const stappen = Array.from({ length: o.gat + 1 }, (_, k) => k);
    for (const i of stappen) {
      if (mijn !== beurt) return;
      // Net achter de tegel landen, zodat het getal zichtbaar blijft
      const doel = tegelPos(i).add(new Vector3(0, 0.3, -0.9));
      const start = tails.groep.position.clone();
      for (let f = 0; f <= 1; f += 0.2) {
        tails.groep.position.lerpVectors(start, doel, f);
        tails.groep.position.y += Math.sin(f * Math.PI) * 0.9;
        await wacht(30);
      }
      tegels[i].flits = 1;
      speelTik();
    }
  }

  async function vraag() {
    const t = teksten.getallenbaan;
    if (o.soort === 'na') {
      await spreek(t.na);
      await spreek(String(o.rij[4]), 'getal');
    } else if (o.soort === 'voor') {
      await spreek(t.voor);
      await spreek(String(o.rij[1]), 'getal');
    } else await spreek(o.soort === 'gat' ? t.gat : t.sprong);
  }

  /** Hint: de tegels springen een voor een op terwijl de stem de getallen telt. */
  async function telMee() {
    const mijn = ++beurt;
    for (let i = 0; i < tegels.length; i++) {
      if (mijn !== beurt) return;
      tegels[i].flits = 1;
      if (i === o.gat) await wacht(500);
      else await spreek(String(o.rij[i]), 'getal');
    }
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(teksten.getallenbaan.start);
      await vraag();
    })();
    return () => {
      beurt++;
      tn?.stop();
    };
  });

  async function kies(n: number) {
    if (vergrendeld || ronde.onthuld || fout.includes(n)) return;
    beurt++;
    const t = tegels[o.gat];
    if (n === o.antwoord) {
      vergrendeld = true;
      speelGoed();
      zetGetal(t, n, '#86efac');
      t.flits = 1;
      await vliegNaarGat();
      brokken.spuit(doelPos.clone().setY(doelPos.y + 1.5), [0xfde047, 0xffffff, 0x22c55e, 0xf97316], 24, 7, 7);
      glitterOp(merkEl ?? null);
      opRingen(ronde.goed(), merkEl);
      boem(merkEl, 170);
      await spreek(String(n), 'getal');
      await spreek(compliment('tails'));
      await wacht(300);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, n];
      t.schud = 1;
      if (ronde.fout(String(n)) === 'onthuld') {
        vergrendeld = true;
        zetGetal(t, o.antwoord, '#86efac');
        await spreek(teksten.hetIs);
        await spreek(String(o.antwoord), 'getal');
        await vliegNaarGat();
        await wacht(800);
        volgende();
      } else {
        await spreek(bijna());
        await spreek(teksten.getallenbaan.hint);
        await telMee();
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
</script>

<div class="baan3d">
  <div class="d3-toneel" bind:this={hostEl}></div>
  <span class="d3-merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span class="icoon" aria-hidden="true">🔢❓</span>
    <div class="d3-luid"><Luidspreker opTik={vraag} /></div>
  </div>
  <div class="keuzes">
    {#each o.keuzes as k, i (k)}
      <button class="knop" class:uit={fout.includes(k)} style="--kleur:{KNOP[i % 3]}" onclick={() => kies(k)} aria-label="Antwoord {k}">{k}</button>
    {/each}
  </div>
</div>

<style>
  .baan3d {
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
  .icoon {
    font-size: 50px;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
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
    min-width: 200px;
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
  }
  .knop:active {
    transform: translateY(5px);
  }
  .knop.uit {
    filter: grayscale(1) brightness(0.65);
    opacity: 0.6;
  }
</style>
