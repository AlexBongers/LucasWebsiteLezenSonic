<script lang="ts">
  /**
   * De achtergrond als echte 3D-wereld, met een camera die langzaam heen en weer zweeft:
   *  heuvel:     groene heuvels, palmen, zonnebloemen, een looping en zwevende ringen (Sonic)
   *  werkplaats: zonsondergang, tandwielen, een windmolen en een rondvliegend vliegtuigje (Tails)
   *  ruines:     jungletempel met een gloeiend kristal, zuilen en een zwevend eiland (Knuckles)
   *  ruimte:     sterren, planeten met een ring, een maanbodem en een raket (uit de winkel)
   * Licht gehouden (geen schaduwen, 30 beelden per seconde) en gepauzeerd tijdens een 3D-spel.
   */
  import { onMount } from 'svelte';
  import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, SphereGeometry, TorusGeometry, Mesh as M3 } from 'three';
  import { Group, Mesh, Vector3, bol, cilinder, gloed, kegel, kubus, maakToneel, ring, ruitTekstuur, toon, vloer, type Toneel } from './drie-d';
  import { wolkVorm } from './drie-d-vormen';
  import type { Wereld } from './werelden';

  let { wereld, pauze = false, opKlaar }: { wereld: Wereld; pauze?: boolean; opKlaar?: () => void } = $props();
  let hostEl: HTMLElement | undefined = $state();
  let tn: Toneel | null = null;

  type Beweeg = (dt: number, t: number) => void;

  function palm(x: number, z: number, h = 5): Group {
    const g = new Group();
    const stam = cilinder(0.28, h, 0x7c4a1e, 0.05);
    stam.position.y = h / 2;
    stam.rotation.z = (x > 0 ? -1 : 1) * 0.08;
    g.add(stam);
    for (let i = 0; i < 6; i++) {
      const blad = bol(1, 0x15803d, [2.1, 0.22, 0.7]);
      const a = (i / 6) * Math.PI * 2;
      blad.position.set(Math.cos(a) * 1.3, h + 0.1, Math.sin(a) * 1.3);
      blad.rotation.y = -a;
      blad.rotation.z = -0.45;
      g.add(blad);
    }
    g.position.set(x, 0, z);
    return g;
  }

  function boom(x: number, z: number, s = 1): Group {
    const g = new Group();
    const stam = cilinder(0.3 * s, 2.4 * s, 0x7c4a1e, 0.05);
    stam.position.y = 1.2 * s;
    g.add(stam);
    [0x15803d, 0x16a34a, 0x22c55e].forEach((k, i) => {
      const c = kegel((2 - i * 0.5) * s, 2.2 * s, k, 0.05);
      c.position.y = (2.6 + i * 1.2) * s;
      g.add(c);
    });
    g.position.set(x, 0, z);
    return g;
  }

  function wolken(scene: Toneel['scene'], kleur = 0xffffff, hoogte = 13): Beweeg {
    const lijst: Group[] = [];
    for (let i = 0; i < 9; i++) {
      const w = wolkVorm(1.4 + (i % 3) * 0.6, kleur);
      w.position.set(-50 + i * 12, hoogte + (i % 3) * 2.5, -30 - (i % 2) * 12);
      scene.add(w);
      lijst.push(w);
    }
    return (dt) => {
      for (const w of lijst) {
        w.position.x += dt * 0.6;
        if (w.position.x > 60) w.position.x = -60;
      }
    };
  }

  function zwevendeRingen(scene: Toneel['scene'], n = 12): Beweeg {
    const lijst: { m: Mesh; basis: Vector3 }[] = [];
    for (let i = 0; i < n; i++) {
      const r = ring(0.6, 0.17);
      const basis = new Vector3((i % 2 ? 1 : -1) * (7 + (i * 3.7) % 18), 4 + (i * 1.3) % 6, -6 - (i * 2.9) % 22);
      r.position.copy(basis);
      scene.add(r);
      lijst.push({ m: r, basis });
    }
    return (_dt, t) => {
      lijst.forEach((r, i) => {
        r.m.rotation.y = t * 1.6 + i;
        r.m.position.y = r.basis.y + Math.sin(t * 1.2 + i) * 0.5;
      });
    };
  }

  function bouwHeuvel(t: Toneel): Beweeg[] {
    const { scene } = t;
    scene.add(vloer(ruitTekstuur('#b45309', '#d97706', [44, 44]), 220, 220));
    const gras = vloer(null, 220, 60, 0x22c55e);
    gras.position.set(0, 0.02, -50);
    scene.add(gras);
    // Heuvels met een randje schaakbord eronder
    for (let i = 0; i < 9; i++) {
      const h = bol(9 + (i % 3) * 3, [0x16a34a, 0x22c55e, 0x15803d][i % 3], [1.6, 0.75, 1]);
      h.position.set(-70 + i * 18, -2, -55 - (i % 2) * 10);
      scene.add(h);
    }
    // De looping
    const loop = new M3(new TorusGeometry(7, 1, 14, 60), toon(0x2563eb));
    loop.position.set(22, 7.5, -42);
    scene.add(loop);
    const loopRand = new M3(new TorusGeometry(7, 1.15, 10, 60), toon(0xfbbf24));
    loopRand.scale.set(1, 1, 0.4);
    loopRand.position.copy(loop.position);
    scene.add(loopRand);
    for (const [x, z] of [[-14, -10], [-20, -18], [15, -9], [24, -20], [-30, -28], [32, -30], [-9, -24], [9, -26]]) scene.add(palm(x, z, 5 + ((x * 7) % 3)));
    // Zonnebloemen
    const bloemen: Group[] = [];
    for (let i = 0; i < 10; i++) {
      const b = new Group();
      const steel = cilinder(0.08, 1.8, 0x15803d, 0.04);
      steel.position.y = 0.9;
      b.add(steel);
      const kop = cilinder(0.6, 0.15, 0xfacc15, 0.04);
      kop.rotation.x = Math.PI / 2;
      kop.position.y = 1.9;
      b.add(kop);
      const hart = cilinder(0.3, 0.2, 0x92400e, 0.03);
      hart.rotation.x = Math.PI / 2;
      hart.position.set(0, 1.9, 0.05);
      b.add(hart);
      b.position.set((i % 2 ? 1 : -1) * (6 + (i * 2.3) % 16), 0, -2 - (i * 1.7) % 10);
      scene.add(b);
      bloemen.push(b);
    }
    const zon = new M3(new SphereGeometry(4, 24, 16), toon(0xfde047, 1));
    zon.position.set(-24, 22, -70);
    scene.add(zon);
    const zonGloed = gloed(26, 0xfde68a, 0.6);
    zonGloed.position.copy(zon.position);
    scene.add(zonGloed);
    return [
      wolken(scene),
      zwevendeRingen(scene),
      (_dt, tt) => bloemen.forEach((b, i) => (b.rotation.z = Math.sin(tt * 1.4 + i) * 0.08)),
    ];
  }

  function bouwWerkplaats(t: Toneel): Beweeg[] {
    const { scene } = t;
    scene.add(vloer(ruitTekstuur('#4b5568', '#5d6a80', [44, 44]), 220, 220));
    const baan = vloer(null, 8, 120, 0x334155);
    baan.position.set(-16, 0.02, -30);
    baan.rotation.z = 0.5;
    scene.add(baan);
    // Hangar
    const hal = kubus(16, 7, 10, 0x7b6b9c);
    hal.position.set(18, 3.5, -30);
    scene.add(hal);
    const dak = cilinder(5.2, 16, 0x5b4b7c);
    dak.rotation.z = Math.PI / 2;
    dak.position.set(18, 7, -30);
    scene.add(dak);
    const deur = kubus(9, 5.5, 0.3, 0x1e293b);
    deur.position.set(18, 2.75, -24.9);
    scene.add(deur);
    // Windmolen
    const toren = kegel(1.6, 12, 0xe2e8f0);
    toren.position.set(-22, 6, -34);
    scene.add(toren);
    const wieken = new Group();
    for (let i = 0; i < 4; i++) {
      const w = kubus(0.6, 6, 0.15, 0xf8fafc, 0.03);
      w.position.y = 3;
      const arm = new Group();
      arm.add(w);
      arm.rotation.z = (i / 4) * Math.PI * 2;
      wieken.add(arm);
    }
    wieken.position.set(-22, 11.5, -32.2);
    scene.add(wieken);
    // Tandwielen
    const wielen: Group[] = [];
    for (const [x, y, r, k] of [[-12, 8, 3.6, 0x94a3b8], [-7.5, 12, 2.4, 0xfb923c], [12, 12, 2.8, 0xfacc15], [7, 16, 2, 0x94a3b8]] as const) {
      const g = new Group();
      const schijf = cilinder(r, 0.7, k);
      schijf.rotation.x = Math.PI / 2;
      g.add(schijf);
      for (let i = 0; i < 10; i++) {
        const h = (i / 10) * Math.PI * 2;
        const tand = kubus(r * 0.35, r * 0.3, 0.7, k, 0.04);
        tand.position.set(Math.cos(h) * r * 1.08, Math.sin(h) * r * 1.08, 0);
        tand.rotation.z = h;
        g.add(tand);
      }
      g.position.set(x, y, -40);
      scene.add(g);
      wielen.push(g);
    }
    // Een vliegtuigje dat rondjes vliegt
    const vlieg = new Group();
    const romp = cilinder(0.5, 3.2, 0xf59e0b);
    romp.rotation.x = Math.PI / 2;
    vlieg.add(romp);
    for (const y of [-0.2, 0.7]) {
      const vleugel = kubus(5, 0.12, 1, 0xef4444, 0.03);
      vleugel.position.y = y;
      vlieg.add(vleugel);
    }
    const staart = kubus(0.12, 0.9, 0.7, 0xef4444, 0.03);
    staart.position.set(0, 0.5, 1.4);
    vlieg.add(staart);
    const prop = kubus(2.2, 0.2, 0.05, 0x334155, 0.02);
    prop.position.z = -1.7;
    vlieg.add(prop);
    scene.add(vlieg);
    return [
      wolken(scene, 0xffe4e6, 15),
      (dt, tt) => {
        wieken.rotation.z += dt * 0.8;
        wielen.forEach((w, i) => (w.rotation.z += dt * (i % 2 ? -0.5 : 0.35)));
        const a = tt * 0.25;
        vlieg.position.set(Math.cos(a) * 26, 14 + Math.sin(tt * 0.7) * 1.5, -30 + Math.sin(a) * 12);
        vlieg.rotation.y = -a + Math.PI;
        vlieg.rotation.z = 0.35;
        prop.rotation.z += dt * 30;
      },
    ];
  }

  function bouwRuines(t: Toneel): Beweeg[] {
    const { scene } = t;
    scene.add(vloer(ruitTekstuur('#3f6153', '#4c7565', [40, 40]), 220, 220));
    [[30, 3, 16], [23, 3, 12.5], [16, 3, 9], [9, 3, 5.6]].forEach(([w, h, d], i) => {
      const trap = kubus(w, h, d, [0x3c5a50, 0x486b5f, 0x547c6e, 0x628a7b][i], 0.02);
      trap.position.set(0, h / 2 + i * h, -40);
      scene.add(trap);
    });
    const kristal = new Group();
    for (const dir of [1, -1]) {
      const k = kegel(1.8, 3.6, 0x4ade80, 0.06);
      k.position.y = dir === 1 ? 1.8 : 0;
      k.rotation.x = dir === 1 ? 0 : Math.PI;
      kristal.add(k);
    }
    kristal.position.set(0, 15, -40);
    scene.add(kristal);
    const kGloed = gloed(14, 0x4ade80, 0.7);
    kGloed.position.set(0, 16, -39);
    scene.add(kGloed);
    for (const x of [-16, -11, 11, 16]) {
      const z = cilinder(1, 9, 0x627d72);
      z.position.set(x, 4.5, -22);
      scene.add(z);
      const kap = kubus(2.6, 0.7, 2.6, 0x7a9488);
      kap.position.set(x, 9.3, -22);
      scene.add(kap);
    }
    for (let i = 0; i < 16; i++) {
      const x = (i % 2 ? 1 : -1) * (13 + (i * 3.1) % 24);
      scene.add(boom(x, -8 - (i * 2.3) % 26, 1 + (i % 3) * 0.25));
    }
    // Zwevend eiland met een waterval
    const eiland = new Group();
    const top = cilinder(5, 1, 0x22c55e);
    eiland.add(top);
    const rots = kegel(4.8, 7, 0x6b4f3a);
    rots.rotation.x = Math.PI;
    rots.position.y = -4;
    eiland.add(rots);
    const eilandBoom = boom(1, 0, 0.7);
    eilandBoom.position.y = 0.5;
    eiland.add(eilandBoom);
    eiland.position.set(20, 16, -48);
    scene.add(eiland);
    return [
      (_dt, tt) => {
        kristal.rotation.y = tt * 0.6;
        kristal.position.y = 15 + Math.sin(tt * 1.2) * 0.4;
        eiland.position.y = 16 + Math.sin(tt * 0.5) * 0.8;
      },
    ];
  }

  function bouwRuimte(t: Toneel): Beweeg[] {
    const { scene } = t;
    scene.add(vloer(null, 220, 220, 0x64748b));
    for (let i = 0; i < 14; i++) {
      const k = cilinder(1 + (i % 3), 0.15, 0x475569, 0.02);
      k.position.set((i % 2 ? 1 : -1) * (5 + (i * 4.7) % 30), 0.05, -4 - (i * 3.3) % 40);
      scene.add(k);
    }
    // Sterren
    const pos: number[] = [];
    for (let i = 0; i < 600; i++) {
      const a = Math.random() * Math.PI * 2;
      const h = 0.05 + Math.random() * 0.9;
      pos.push(Math.cos(a) * 120, h * 90, Math.sin(a) * 120 - 20);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    const sterren = new Points(geo, new PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true }));
    scene.add(sterren);
    // Planeten
    const ringPlaneet = bol(7, 0xf59e0b, [1, 1, 1], 0.03);
    ringPlaneet.position.set(26, 22, -70);
    scene.add(ringPlaneet);
    const band = new M3(new TorusGeometry(11, 1, 6, 60), toon(0xfcd34d));
    band.rotation.set(1.2, 0.2, 0.3);
    band.position.copy(ringPlaneet.position);
    scene.add(band);
    const rood = bol(3.5, 0xef4444, [1, 1, 1], 0.03);
    rood.position.set(-30, 18, -60);
    scene.add(rood);
    const maan = bol(2, 0xe2e8f0, [1, 1, 1], 0.03);
    maan.position.set(-6, 26, -80);
    scene.add(maan);
    // Raket
    const raket = new Group();
    const lijf = cilinder(0.7, 3.4, 0xf8fafc);
    raket.add(lijf);
    const neus = kegel(0.7, 1.4, 0xef4444);
    neus.position.y = 2.4;
    raket.add(neus);
    const vlam = kegel(0.5, 1.6, 0xfbbf24);
    vlam.rotation.x = Math.PI;
    vlam.position.y = -2.5;
    raket.add(vlam);
    const vGloed = gloed(4, 0xfb923c, 0.8);
    vGloed.position.y = -2.6;
    raket.add(vGloed);
    scene.add(raket);
    return [
      (dt, tt) => {
        sterren.rotation.y += dt * 0.004;
        band.rotation.z += dt * 0.05;
        const f = (tt * 0.06) % 1;
        raket.position.set(-50 + f * 100, 4 + f * 30, -30);
        raket.rotation.z = -0.9;
        vlam.scale.y = 1 + Math.sin(tt * 30) * 0.25;
      },
    ];
  }

  const LUCHT: Record<Wereld, [string, string, string]> = {
    heuvel: ['#0a3a9e', '#3b9cf0', '#bfe6ff'],
    werkplaats: ['#2b2a7a', '#c4527f', '#ffb878'],
    ruines: ['#06263a', '#0b6b72', '#7ee0b0'],
    ruimte: ['#050816', '#1e1b4b', '#3b2a7a'],
  };
  const MIST: Record<Wereld, number | undefined> = { heuvel: 0xbfe6ff, werkplaats: 0xffb878, ruines: 0x2a8a82, ruimte: undefined };

  onMount(() => {
    if (!hostEl) return;
    tn = maakToneel(hostEl, {
      lucht: LUCHT[wereld],
      mist: MIST[wereld],
      mistAfstand: [40, 130],
      fov: 52,
      glitter: wereld === 'ruines' ? 0x86efac : 0xfff7c2,
      licht: { fps: 30 },
    });
    const bewegingen = wereld === 'heuvel' ? bouwHeuvel(tn) : wereld === 'werkplaats' ? bouwWerkplaats(tn) : wereld === 'ruines' ? bouwRuines(tn) : bouwRuimte(tn);
    const cam = tn.camera;
    tn.bij((dt, t) => {
      cam.position.set(Math.sin(t * 0.06) * 6, 5 + Math.sin(t * 0.09) * 0.6, 16);
      cam.lookAt(Math.sin(t * 0.06) * 2, 5.5, -10);
      for (const b of bewegingen) b(dt, t);
    });
    opKlaar?.();
    return () => tn?.stop();
  });

  $effect(() => {
    tn?.pauzeer(pauze);
  });
</script>

<div class="wereld3d" bind:this={hostEl} aria-hidden="true"></div>

<style>
  .wereld3d {
    position: absolute;
    inset: 0;
  }
</style>
