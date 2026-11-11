<script lang="ts">
  /**
   * 3D Woord-race (Sonic). In een grote gouden ring flitst een woordje. Daarna komen drie plaatjes omhoog:
   * tik het plaatje dat bij het woord hoort en Sonic racet erheen. De flits wordt korter als het goed gaat.
   */
  import { onMount } from 'svelte';
  import { FLITS_MAX, nieuweFlitstijd, type WoordRaceOpgave } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik, speelWhoosh } from '../audio/geluid';
  import { boem } from '../ui/boem';
  import { glitterOp } from '../ui/feest';
  import { vg } from '../store/voortgang.svelte';
  import { Brokken, Group, Mesh, Vector3, bol, cilinder, gloed, kubus, maakRenner, maakToneel, ring, ruitTekstuur, toon, vloer, type Renner, type Toneel } from '../ui/drie-d';
  import { emojiPlaat, ruimOp, woordPlaat, wolkVorm, zoekMet } from '../ui/drie-d-vormen';
  import { TorusGeometry } from 'three';
  import { teksten, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import { flitsMaal } from './uitrusting.svelte';
  import type { SpelProps } from './types';

  let { opRingen, opVoortgang, opKlaar, opgaven = [] }: SpelProps<WoordRaceOpgave> = $props();

  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<WoordRaceOpgave>(opgaven as Gepland<WoordRaceOpgave>[], { opKlaar, opVoortgang });
  let o = $derived(ronde.huidig);
  type Fase = 'klaar' | 'flits' | 'kiezen' | 'wacht' | 'goed';
  let fase: Fase = $state('klaar');
  let fout: string[] = $state([]);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();

  type Kaart = { groep: Group; woord: string; thuis: Vector3; omhoog: number; fout: boolean; goed: boolean };
  let tn: Toneel | null = null;
  let portaal: Group;
  let bord: Mesh | null = null;
  let bordSchaal = 0;
  let kaarten: Kaart[] = [];
  let sonic: Renner;
  let brokken: Brokken;
  let rent: { van: Vector3; naar: Vector3; t: number; duur: number; klaar: () => void } | null = null;
  let kick = 0;
  let portaalSpin = 0;

  const START = new Vector3(0, 0, 5.2);

  function bouwKaarten() {
    for (const k of kaarten) ruimOp(k.groep);
    kaarten = o.keuzes.map((kz, i) => {
      const groep = new Group();
      const thuis = new Vector3((i - 1) * 5.2, 0, 1.5);
      groep.position.copy(thuis).setY(-6.5);
      groep.userData.keuze = kz.woord;
      const zuil = cilinder(0.5, 2, 0x60a5fa);
      zuil.position.y = 1;
      groep.add(zuil);
      const plaat = kubus(3, 3, 0.35, 0xffffff, 0.05);
      plaat.position.y = 3.6;
      groep.add(plaat);
      const rand = kubus(3.3, 3.3, 0.25, [0xef4444, 0x3b82f6, 0x22c55e][i], 0.04);
      rand.position.set(0, 3.6, -0.08);
      groep.add(rand);
      const em = emojiPlaat(kz.emoji, 2.6);
      em.position.set(0, 3.6, 0.2);
      groep.add(em);
      tn?.scene.add(groep);
      return { groep, woord: kz.woord, thuis, omhoog: 0, fout: false, goed: false };
    });
  }

  function zetBord() {
    if (bord) ruimOp(bord);
    bord = woordPlaat(o.woord, 2.1);
    bord.position.set(0, 0, 0.1);
    bord.scale.setScalar(0.01);
    portaal.add(bord);
    bordSchaal = 0;
  }

  function bouwWereld(host: HTMLElement) {
    tn = maakToneel(host, { lucht: ['#0a3a9e', '#3b9cf0', '#bfe6ff'], mist: 0xbfe6ff, mistAfstand: [34, 95], fov: 50 });
    const { scene, camera } = tn;
    scene.add(vloer(ruitTekstuur('#b45309', '#d97706', [36, 36]), 160, 160));
    const gras = vloer(null, 160, 40, 0x22c55e);
    gras.position.set(0, 0.02, -26);
    scene.add(gras);
    // Heuvels, palmen en wolken
    for (let i = 0; i < 7; i++) {
      const h = bol(6 + (i % 3) * 2, [0x16a34a, 0x22c55e, 0x15803d][i % 3], [1.6, 0.8, 1]);
      h.position.set(-36 + i * 12, -1, -34 - (i % 2) * 6);
      scene.add(h);
    }
    for (const x of [-14, -9, 9, 14]) {
      const stam = cilinder(0.25, 5, 0x7c4a1e, 0.05);
      stam.position.set(x, 2.5, -8 - Math.abs(x) * 0.3);
      scene.add(stam);
      for (let i = 0; i < 6; i++) {
        const blad = bol(0.9, 0x15803d, [2, 0.25, 0.7]);
        blad.position.set(x + Math.cos((i / 6) * Math.PI * 2) * 1.2, 5.2, stam.position.z + Math.sin((i / 6) * Math.PI * 2) * 1.2);
        blad.rotation.y = (i / 6) * Math.PI * 2;
        blad.rotation.z = -0.4;
        scene.add(blad);
      }
    }
    for (let i = 0; i < 6; i++) {
      const w = wolkVorm(1.3 + (i % 3) * 0.4);
      w.position.set(-28 + i * 11, 13 + (i % 2) * 2, -30);
      scene.add(w);
    }

    // Het ringportaal
    portaal = new Group();
    portaal.position.set(0, 6.4, -3);
    const groteRing = new Mesh(new TorusGeometry(3.4, 0.45, 18, 48), toon(0xfbbf24, 0.5));
    portaal.add(groteRing);
    portaal.add(gloed(11, 0xfde68a, 0.35));
    scene.add(portaal);
    const zwevers: Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const r = ring(0.45, 0.13);
      scene.add(r);
      zwevers.push(r);
    }

    sonic = maakRenner('sonic', vg.winkel.gekozen.held === 'super', vg.winkel.kleding.sonic);
    sonic.groep.position.copy(START);
    sonic.groep.scale.setScalar(0.95);
    sonic.groep.rotation.y = Math.PI;
    scene.add(sonic.groep);
    brokken = new Brokken(scene, 0.05);

    tn.bij((dt, t) => {
      kick = Math.max(0, kick - dt * 2);
      camera.fov = 50 + kick * 8;
      camera.updateProjectionMatrix();
      camera.position.set(Math.sin(t * 0.3) * 1.4, 7, 17);
      camera.lookAt(0, 3.6, 0);
      portaalSpin = Math.max(0, portaalSpin - dt);
      groteRing.rotation.y = portaalSpin > 0 ? (1 - portaalSpin) * Math.PI * 2 : Math.sin(t * 0.8) * 0.15;
      portaal.position.y = 6.4 + Math.sin(t * 1.3) * 0.15;
      if (bord) {
        const doel = fase === 'flits' || fase === 'goed' ? 1 : 0.01;
        bordSchaal += (doel - bordSchaal) * Math.min(1, dt * 14);
        bord.scale.setScalar(Math.max(0.01, bordSchaal));
      }
      zwevers.forEach((r, i) => {
        const a = t * 0.6 + (i / zwevers.length) * Math.PI * 2;
        r.position.set(Math.cos(a) * 13, 9 + Math.sin(t * 1.3 + i) * 1.2, -10 + Math.sin(a) * 3);
        r.rotation.y = t * 2;
      });
      for (const k of kaarten) {
        const doel = fase === 'kiezen' || fase === 'wacht' || fase === 'goed' ? 1 : 0;
        k.omhoog += (doel - k.omhoog) * Math.min(1, dt * 6);
        const zak = k.fout ? -1.6 : 0;
        k.groep.position.y += (k.thuis.y - 6.5 + k.omhoog * 6.5 + zak - k.groep.position.y) * Math.min(1, dt * 8);
        k.groep.rotation.y = Math.sin(t * 1.2 + k.thuis.x) * 0.12;
        const s = k.goed ? 1.12 + Math.sin(t * 10) * 0.04 : 1;
        k.groep.scale.setScalar(s);
      }
      if (rent) {
        rent.t += dt;
        const f = Math.min(1, rent.t / rent.duur);
        sonic.groep.position.lerpVectors(rent.van, rent.naar, f);
        sonic.groep.position.y += Math.sin(f * Math.PI) * 1.2;
        if (f >= 1) {
          const k = rent.klaar;
          rent = null;
          k();
        }
      }
      sonic.update(t, !!rent);
      brokken.update(dt);
    });

    host.addEventListener('pointerdown', (e) => {
      if (!tn) return;
      if (fase === 'klaar') {
        void start();
        return;
      }
      if (fase !== 'kiezen') return;
      const raak = tn.raak(e.clientX, e.clientY, kaarten.filter((k) => !k.fout).map((k) => k.groep));
      const w = zoekMet<string>(raak, 'keuze');
      if (w) void kies(w);
    });
    bouwKaarten();
    zetBord();
  }

  onMount(() => {
    if (!hostEl) return;
    bouwWereld(hostEl);
    void spreek(teksten.woordrace.start);
    return () => tn?.stop();
  });

  async function flits(duur: number) {
    speelTik();
    speelWhoosh();
    portaalSpin = 1;
    fase = 'flits';
    await wacht(duur * flitsMaal());
    fase = 'kiezen';
    void spreek(teksten.woordrace.vraag);
  }

  const start = () => flits(vg.flitstijd);

  function zetMerk(k: Kaart) {
    if (!merkEl || !tn) return;
    const p = tn.projecteer(k.groep.position.clone().setY(3.6));
    merkEl.style.left = `${p.x - 20}px`;
    merkEl.style.top = `${p.y - 20}px`;
  }

  function racet(naar: Vector3, duur = 0.45): Promise<void> {
    return new Promise((klaar) => (rent = { van: sonic.groep.position.clone(), naar, t: 0, duur, klaar }));
  }

  async function kies(woord: string) {
    if (fase !== 'kiezen' || fout.includes(woord)) return;
    const k = kaarten.find((x) => x.woord === woord)!;
    const eerste = !ronde.rij[ronde.index].herhaling;
    if (woord === o.woord) {
      fase = 'goed';
      k.goed = true;
      speelGoed();
      if (eerste && ronde.pogingen === 0) vg.flitstijd = nieuweFlitstijd(vg.flitstijd, true);
      await racet(new Vector3(k.thuis.x, 0, k.thuis.z + 1.6));
      kick = 1;
      zetMerk(k);
      brokken.spuit(k.groep.position.clone().setY(3.6), [0xfde047, 0xffffff, 0x38bdf8, 0xf472b6], 26, 8, 7);
      glitterOp(merkEl ?? null);
      opRingen(ronde.goed(), merkEl);
      boem(merkEl, 170);
      await spreek(o.woord, 'woord');
      await spreek(compliment('sonic'));
      await wacht(250);
      volgende();
    } else {
      speelBijna();
      fout = [...fout, woord];
      k.fout = true;
      if (eerste && ronde.pogingen === 0) vg.flitstijd = nieuweFlitstijd(vg.flitstijd, false);
      if (ronde.fout(woord) === 'onthuld') {
        fase = 'goed';
        kaarten.find((x) => x.woord === o.woord)!.goed = true;
        await spreek(teksten.hetIs);
        await spreek(o.woord, 'woord');
        await wacht(1200);
        volgende();
      } else {
        fase = 'wacht';
        await spreek(bijna());
        await spreek(teksten.woordrace.nogEens);
        await flits(Math.min(FLITS_MAX, vg.flitstijd * 1.7));
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    fase = 'klaar';
    sonic.groep.position.copy(START);
    bouwKaarten();
    zetBord();
  }
</script>

<div class="race">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>
  <div class="vraag opdrachtkaart">
    <span class="oog">{fase === 'klaar' ? '👀' : '🖼️❓'}</span>
  </div>
  {#if fase === 'klaar'}
    <button class="knop-goud start" onclick={start} aria-label="Laat zien">👀</button>
  {/if}
</div>

<style>
  .race {
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
    padding: 10px 32px;
    font-size: 38px;
    font-weight: 700;
    z-index: 4;
  }
  .start {
    position: absolute;
    left: 50%;
    bottom: 26px;
    transform: translateX(-50%);
    min-width: 220px;
    min-height: 110px;
    font-size: 70px;
    z-index: 4;
    animation: puls 1.3s ease-in-out infinite;
  }
  @keyframes puls {
    0%, 100% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.06); }
  }
</style>
