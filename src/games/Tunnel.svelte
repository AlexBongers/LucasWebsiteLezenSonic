<script lang="ts">
  /**
   * 3D Turbo-tunnel. Sonic (letters) of Tails (sommen) rent door een 3D-wereld naar drie poorten.
   * Tik op een baan om te sturen; de poort met het goede antwoord ga je dwars doorheen.
   *  - tunnel:     de stem zegt een woord; kies de poort met de eerste letter
   *  - tunnelsom:  een som met ringen; kies de poort met het antwoord
   */
  import { onMount } from 'svelte';
  import Luidspreker from '../ui/Luidspreker.svelte';
  import type { SmashOpgave, Som } from '../engine/generator-lucas';
  import type { Gepland } from '../engine/sessie';
  import { somDelen, spreek } from '../audio/stem';
  import { speelBijna, speelGoed, speelTik, speelWhoosh } from '../audio/geluid';
  import { boem, schud } from '../ui/boem';
  import {
    Brokken, Group, Mesh, Vector3, bol, cilinder, kegel, kubus, letterTekstuur, maakRenner, maakToneel, ring, ruitTekstuur, toon,
    type Toneel,
  } from '../ui/drie-d';
  import { MeshBasicMaterial, PlaneGeometry, BoxGeometry, SphereGeometry, Fog } from 'three';
  import { teksten, rondeStart, compliment, bijna, wacht } from './teksten';
  import { Ronde } from './ronde.svelte';
  import { drieKeuzes } from './keuze';
  import type { SpelProps } from './types';

  type Opgave = SmashOpgave | Som;
  let { spel = 'tunnel', opRingen, opVoortgang, opKlaar, opgaven = [], niveau = 0 }: SpelProps<Opgave> = $props();

  // svelte-ignore state_referenced_locally
  const letters = spel === 'tunnel';
  // svelte-ignore state_referenced_locally
  const ronde = new Ronde<Opgave>(opgaven as Gepland<Opgave>[], { opKlaar, opVoortgang });
  const KLEUREN = ['#ef4444', '#3b82f6', '#22c55e'];
  const BAAN = [-3.1, 0, 3.1];

  let o = $derived(ronde.huidig);
  let opties = $derived(letters ? drieKeuzes((o as SmashOpgave).keuzes, (o as SmashOpgave).letter) : drieKeuzes((o as Som).keuzes.map(String), String((o as Som).antwoord)));
  let goed = $derived(letters ? (o as SmashOpgave).letter : String((o as Som).antwoord));
  let som = $derived(letters ? null : (o as Som));
  let toonRingen = $derived(niveau <= 1 || ronde.pogingen > 0 || ronde.onthuld);

  type Fase = 'wacht' | 'komt' | 'uitslag' | 'terug';
  let fase = $state<Fase>('wacht');
  let laan = $state(1);
  let fout: string[] = $state([]);
  let hostEl: HTMLElement | undefined = $state();
  let merkEl: HTMLElement | undefined = $state();

  // 3D-dingen (geen $state: Three.js-objecten mogen niet door Svelte worden verpakt)
  let tn: Toneel | null = null;
  let poorten: { groep: Group; paneel: Mesh }[] = [];
  let poortZ = -52;
  let fasePlain: Fase = 'wacht';
  let snelheid = 7;
  let schudden = 0;
  let sprong = 0;
  let renner: ReturnType<typeof maakRenner>;
  let rennerX = 0;
  let ref = $state(0);

  const stand = (f: Fase) => {
    fase = f;
    fasePlain = f;
  };

  // ------------------------------------------------------------ De 3D-wereld bouwen
  function bouw(host: HTMLElement) {
    tn = maakToneel(host, { lucht: letters ? ['#1d4ed8', '#38bdf8', '#bae6fd'] : ['#7c3aed', '#f97316', '#fde68a'], mist: letters ? 0xbae6fd : 0xfde68a, mistAfstand: [25, 95], fov: 58 });
    const { scene, camera } = tn;
    camera.position.set(0, 3.5, 7.4);
    camera.lookAt(0, 1.3, -8);

    // Baan met banen en kantstenen
    const vloerTex = ruitTekstuur(letters ? '#fcd34d' : '#fdba74', letters ? '#f59e0b' : '#fb923c', [3, 90]);
    const vloer = new Mesh(new PlaneGeometry(10.5, 360), new MeshBasicMaterial({ map: vloerTex }));
    vloer.rotation.x = -Math.PI / 2;
    vloer.position.set(0, 0, -150);
    scene.add(vloer);
    for (const x of [-1.55, 1.55]) {
      const streep = new Mesh(new PlaneGeometry(0.16, 360), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
      streep.rotation.x = -Math.PI / 2;
      streep.position.set(x * 1.0 + (x < 0 ? -0.0 : 0.0), 0.02, -150);
      streep.position.x = x * 1.0;
      scene.add(streep);
    }
    const gras = new Mesh(new PlaneGeometry(200, 360), new MeshBasicMaterial({ color: letters ? 0x22c55e : 0xa855f7 }));
    gras.rotation.x = -Math.PI / 2;
    gras.position.set(0, -0.05, -150);
    scene.add(gras);
    for (const x of [-5.5, 5.5]) {
      const muur = kubus(0.9, 0.8, 360, letters ? 0xdc2626 : 0x7c3aed);
      muur.position.set(x, 0.4, -150);
      scene.add(muur);
    }

    // Zon en bergen in de verte
    const zon = new Mesh(new SphereGeometry(9, 20, 14), new MeshBasicMaterial({ color: 0xfef08a, fog: false }));
    zon.position.set(26, 24, -120);
    scene.add(zon);
    for (const [x, s, k] of [[-45, 30, 0x4ade80], [-18, 22, 0x22c55e], [30, 34, 0x16a34a], [58, 26, 0x4ade80]] as const) {
      const berg = kegel(s * 0.8, s, letters ? k : 0xc084fc, 0);
      berg.position.set(x, s * 0.5, -140);
      scene.add(berg);
    }

    // Palmen (of kristallen) langs de baan, wolken en ringen: alles schuift mee
    const bewegend: { o: Group | Mesh; speed: number; dz: number }[] = [];
    const voeg = (obj: Group | Mesh, z: number, snelFactor = 1) => {
      obj.position.z = z;
      scene.add(obj);
      bewegend.push({ o: obj, speed: snelFactor, dz: 130 });
    };
    for (let i = 0; i < 14; i++) {
      for (const kant of [-1, 1]) {
        const boom = new Group();
        if (letters) {
          const stam = cilinder(0.28, 4.2, 0x92400e);
          stam.position.y = 2.1;
          stam.rotation.z = kant * 0.12;
          boom.add(stam);
          for (let b = 0; b < 5; b++) {
            const blad = kegel(0.4, 2.4, 0x16a34a, 0.1);
            blad.position.set(Math.cos((b / 5) * 6.28) * 0.9, 4.4, Math.sin((b / 5) * 6.28) * 0.9);
            blad.rotation.set(Math.sin((b / 5) * 6.28) * 1.2, 0, -Math.cos((b / 5) * 6.28) * 1.2);
            boom.add(blad);
          }
        } else {
          const k = kegel(0.9, 3 + (i % 3), [0x22d3ee, 0xf472b6, 0xfacc15][i % 3], 0.07);
          k.position.y = 1.6 + (i % 3) * 0.5;
          boom.add(k);
          const k2 = kegel(0.5, 2, 0xffffff, 0.07);
          k2.position.set(0.8, 1, 0.3);
          k2.rotation.z = -0.4;
          boom.add(k2);
        }
        boom.position.x = kant * (7.4 + (i % 4) * 1.6);
        voeg(boom, -i * 9.6 + 8);
      }
    }
    for (let i = 0; i < 7; i++) {
      const wolk = new Group();
      for (let j = 0; j < 4; j++) {
        const b = bol(1.4 + j * 0.1, 0xffffff, [1.3, 0.75, 1], 0);
        b.position.set(j * 1.4 - 2, (j % 2) * 0.5, 0);
        wolk.add(b);
      }
      wolk.position.set(-60 + i * 22, 20 + (i % 3) * 5, 0);
      voeg(wolk, -20 - i * 15, 0.25);
    }
    for (let i = 0; i < 12; i++) {
      const r = ring(0.55, 0.15);
      r.position.set(BAAN[i % 3], 1.3, 0);
      voeg(r, -i * 9);
    }
    // Snelheidsstrepen
    const strepen: Mesh[] = [];
    for (let i = 0; i < 16; i++) {
      const s = new Mesh(new BoxGeometry(0.06, 0.06, 5), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
      s.position.set((Math.random() - 0.5) * 12, 0.4 + Math.random() * 4.5, -Math.random() * 60);
      s.visible = false;
      scene.add(s);
      strepen.push(s);
    }

    // De renner
    renner = maakRenner(letters ? 'sonic' : 'tails');
    renner.groep.rotation.y = 0;
    scene.add(renner.groep);

    // De drie poorten
    for (let i = 0; i < 3; i++) {
      const groep = new Group();
      for (const x of [-1.5, 1.5]) {
        const paal = cilinder(0.2, 3.6, 0xffffff);
        paal.position.set(x, 1.8, 0);
        groep.add(paal);
      }
      const balk = kubus(3.5, 0.35, 0.5, KLEUREN[i]);
      balk.position.y = 3.7;
      groep.add(balk);
      const paneel = new Mesh(new PlaneGeometry(2.7, 2.7), new MeshBasicMaterial({ color: 0xffffff }));
      paneel.position.set(0, 2.0, 0.1);
      groep.add(paneel);
      const lijst = kubus(3.0, 3.0, 0.2, KLEUREN[i]);
      lijst.position.set(0, 2.0, 0);
      groep.add(lijst);
      groep.position.set(BAAN[i], 0, poortZ);
      scene.add(groep);
      poorten.push({ groep, paneel });
    }

    const brokken = new Brokken(scene, 0);
    brokkenRef = brokken;
    const hulpPunt = new Vector3();

    tn.bij((dt, t) => {
      const dw = fasePlain === 'komt' ? Math.min(1, dt * 4) : Math.min(1, dt * 2);
      const doel = fasePlain === 'komt' ? 24 : fasePlain === 'terug' ? 2 : 7;
      snelheid += (doel - snelheid) * dw;
      vloerTex.offset.y -= (snelheid / 3.84) * dt;
      for (const b of bewegend) {
        b.o.position.z += snelheid * dt * b.speed;
        if (b.o.position.z > 12) b.o.position.z -= b.dz;
        if (b.o instanceof Mesh && b.speed === 1) b.o.rotation.y += dt * 3;
      }
      for (const s of strepen) {
        s.visible = fasePlain === 'komt';
        s.position.z += snelheid * dt * 1.6;
        if (s.position.z > 10) {
          s.position.z -= 70;
          s.position.x = (Math.random() - 0.5) * 12;
        }
      }

      // De poorten komen aan (of wachten in de verte)
      if (fasePlain === 'komt') {
        poortZ += 24 * dt;
        if (poortZ >= -0.9) {
          poortZ = -0.9;
          stand('uitslag');
          void oplossen(laan);
        }
      } else if (fasePlain === 'terug') {
        poortZ -= 60 * dt;
        if (poortZ <= -52) {
          poortZ = -52;
          stand('wacht');
        }
      }
      poorten.forEach((p, i) => {
        p.groep.position.z = poortZ;
        const zweef = fasePlain === 'wacht' ? Math.sin(t * 2.2 + i) * 0.12 : 0;
        p.groep.position.y = zweef;
      });

      // De renner volgt de gekozen baan
      rennerX += (BAAN[laan] - rennerX) * Math.min(1, dt * 10);
      renner.groep.position.x = rennerX;
      renner.groep.rotation.z = (BAAN[laan] - rennerX) * -0.12;
      renner.groep.rotation.y = (BAAN[laan] - rennerX) * -0.18;
      sprong = Math.max(0, sprong - dt);
      renner.groep.position.y = sprong > 0 ? Math.sin((1 - sprong / 0.7) * Math.PI) * 1.9 : 0;
      renner.update(t, fasePlain !== 'wacht' || true);

      // Camera: zacht meewiebelen, met een beetje trillen na een botsing
      schudden = Math.max(0, schudden - dt);
      const trilling = schudden > 0 ? (Math.random() - 0.5) * schudden * 1.2 : 0;
      camera.position.x += (rennerX * 0.45 - camera.position.x) * Math.min(1, dt * 5) + trilling;
      camera.position.y = 3.5 + Math.sin(t * 1.5) * 0.08 + trilling * 0.5;
      camera.fov += ((fasePlain === 'komt' ? 70 : 58) - camera.fov) * Math.min(1, dt * 4);
      camera.updateProjectionMatrix();
      camera.lookAt(rennerX * 0.2, 1.4, -8);
      brokken.update(dt);

      // Het onzichtbare merkpunt volgt de gekozen poort (voor ringen en ontploffing)
      if (merkEl && tn) {
        hulpPunt.set(BAAN[laan], 2.2, Math.min(poortZ, 0));
        const p = tn.projecteer(hulpPunt);
        merkEl.style.left = `${p.x - 20}px`;
        merkEl.style.top = `${p.y - 20}px`;
      }
    });
    zetPoorten();
  }

  let brokkenRef: Brokken | null = null;

  /** De drie poorten krijgen de letters of getallen van deze opgave. */
  function zetPoorten() {
    poorten.forEach((p, i) => {
      const oud = (p.paneel.material as MeshBasicMaterial).map;
      const kleur = fout.includes(opties[i]) ? '#94a3b8' : '#fef9c3';
      const tex = letterTekstuur(opties[i] ?? '', kleur);
      const mat = p.paneel.material as MeshBasicMaterial;
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
      p.paneel.visible = true;
      p.groep.visible = true;
      oud?.dispose();
    });
    ref++;
  }

  // ------------------------------------------------------------ Spelverloop
  onMount(() => {
    if (!hostEl) return;
    bouw(hostEl);
    (async () => {
      { const z = rondeStart(); if (z) await spreek(z); }
      await spreek(letters ? teksten.tunnel.start : teksten.tunnelsom.start);
      await vraag();
    })();
    return () => tn?.stop();
  });

  async function vraag() {
    if (letters) {
      await spreek(teksten.smash.vraag);
      await spreek((o as SmashOpgave).woord, 'woord');
    } else {
      await spreek(somDelen(som!.a, som!.op, som!.b), 'getal');
    }
  }

  function kiesLaan(i: number) {
    if (fasePlain === 'uitslag' || fasePlain === 'terug' || fout.includes(opties[i])) return;
    speelTik();
    laan = i;
    if (fasePlain === 'wacht') {
      speelWhoosh();
      stand('komt');
    }
  }

  async function oplossen(i: number) {
    const gekozen = opties[i];
    if (gekozen === goed) {
      const onthuldNu = ronde.onthuld;
      speelGoed();
      sprong = 0.7;
      const p = poorten[i];
      brokkenRef?.spuit(new Vector3(BAAN[i], 2, -1.5), [0xfbbf24, 0xfde68a, KLEUREN[i], 0xffffff], 26, 8, 6);
      p.groep.visible = false;
      schudden = 0.25;
      if (!onthuldNu) {
        opRingen(ronde.goed(), merkEl);
        boem(merkEl, 190);
        await spreek(letters ? (o as SmashOpgave).woord : somDelen(som!.a, som!.op, som!.b, som!.antwoord), letters ? 'woord' : 'getal');
        await spreek(compliment(letters ? 'sonic' : 'tails'));
      } else {
        await wacht(500);
      }
      await wacht(250);
      volgende();
    } else {
      speelBijna();
      schudden = 0.5;
      schud(5);
      fout = [...fout, gekozen];
      stand('terug');
      const uitkomst = ronde.fout(gekozen);
      if (uitkomst === 'onthuld') {
        zetPoorten();
        await spreek(teksten.hetIs);
        await spreek(goed, letters ? 'woord' : 'getal');
        // Het goede antwoord rennen we zelf nog even door, zodat de poort ook echt kapot gaat.
        fout = opties.filter((x) => x !== goed);
        zetPoorten();
        laan = opties.indexOf(goed);
        await wacht(700);
        speelWhoosh();
        stand('komt');
      } else {
        zetPoorten();
        await spreek(bijna());
        await spreek(letters ? teksten.smash.nogEens : teksten.katapult.hint);
        if (letters) await spreek((o as SmashOpgave).woord, 'woord');
      }
    }
  }

  function volgende() {
    if (!ronde.volgende()) return;
    fout = [];
    poortZ = -52;
    laan = 1;
    stand('wacht');
    zetPoorten();
    void vraag();
  }
</script>

<div class="tunnel">
  <div class="toneel" bind:this={hostEl}></div>
  <span class="merk" bind:this={merkEl}></span>

  {#key ronde.nummer}
    <div class="opdrachtkaart kaart">
      {#if letters}
        <span class="emoji">{(o as SmashOpgave).emoji}</span>
      {:else if som}
        <div class="som">
          <span>{som.a}</span><span class="op">{som.op === '+' ? '+' : '−'}</span><span>{som.b}</span><span class="op">=</span>
          <span class="antw">{ronde.onthuld ? som.antwoord : '?'}</span>
        </div>
        {#if toonRingen}
          <div class="ringrij">
            {#each Array.from({ length: som.a }) as _, i}
              <svg class="r" class:weg={som.op === '-' && i >= som.a - som.b} viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="14" fill="none" stroke="#fbbf24" stroke-width="8" />
              </svg>
            {/each}
            {#if som.op === '+'}
              <span class="plus">+</span>
              {#each Array.from({ length: som.b }) as _, i}
                <svg class="r" viewBox="0 0 40 40" aria-hidden="true">
                  <circle cx="20" cy="20" r="14" fill="none" stroke="#f97316" stroke-width="8" />
                </svg>
              {/each}
            {/if}
          </div>
        {/if}
      {/if}
      <div class="luid"><Luidspreker opTik={vraag} /></div>
    </div>
  {/key}

  <div class="banen">
    {#each [0, 1, 2] as i}
      <button
        class="laan"
        class:aan={laan === i && fase !== 'wacht'}
        class:gekozen={laan === i}
        class:uit={fout.includes(opties[i])}
        style="--kleur:{KLEUREN[i]}"
        onclick={() => kiesLaan(i)}
        aria-label="Poort {opties[i]}"
      >
        <span>{opties[i]}</span>
      </button>
    {/each}
  </div>
  {#if fase === 'wacht'}
    <p class="tip">Tik op een poort en ren erdoorheen!</p>
  {/if}
  <span class="verborgen">{ref}</span>
</div>

<style>
  .tunnel {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 0;
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
  .kaart {
    position: absolute;
    left: 50%;
    top: 6px;
    transform: translateX(-50%);
    padding: 8px 96px 8px 34px;
    min-width: 300px;
    justify-content: center;
    z-index: 4;
  }
  .emoji {
    font-size: 96px;
    line-height: 1.1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
  }
  .som {
    display: flex;
    gap: 14px;
    align-items: center;
    font-size: 78px;
    font-weight: 700;
    line-height: 1.1;
  }
  .op {
    color: #fbbf24;
  }
  .antw {
    color: #fda4af;
  }
  .ringrij {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    max-width: 520px;
    justify-content: center;
  }
  .r {
    width: 30px;
    height: 30px;
    filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.8));
  }
  .r.weg {
    opacity: 0.25;
    filter: grayscale(1);
  }
  .plus {
    font-size: 30px;
    padding: 0 6px;
    font-weight: 700;
  }
  .luid {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
  }
  .banen {
    position: absolute;
    left: 40px;
    right: 40px;
    bottom: 16px;
    display: flex;
    gap: 30px;
    justify-content: center;
    z-index: 4;
  }
  .laan {
    flex: 1;
    max-width: 330px;
    height: 118px;
    border-radius: 28px;
    border: 5px solid #fff;
    background: linear-gradient(180deg, color-mix(in srgb, var(--kleur) 82%, #fff), var(--kleur));
    box-shadow: 0 8px 0 color-mix(in srgb, var(--kleur) 50%, #000), 0 14px 22px rgba(0, 0, 0, 0.4);
    color: #fff;
    font-family: var(--font-lees);
    font-size: 78px;
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
    transition: transform 0.12s;
  }
  .laan.gekozen {
    transform: translateY(-8px) scale(1.04);
    box-shadow: 0 8px 0 color-mix(in srgb, var(--kleur) 50%, #000), 0 0 34px color-mix(in srgb, var(--kleur) 90%, #fff), 0 14px 22px rgba(0, 0, 0, 0.4);
  }
  .laan:active {
    transform: translateY(4px);
  }
  .laan.uit {
    filter: grayscale(1) brightness(0.65);
    opacity: 0.6;
    transform: none;
  }
  .tip {
    position: absolute;
    left: 50%;
    bottom: 148px;
    transform: translateX(-50%);
    margin: 0;
    padding: 6px 22px;
    border-radius: 999px;
    background: rgba(10, 21, 64, 0.65);
    color: #fff;
    font-size: 26px;
    animation: puls 1.4s ease-in-out infinite;
    pointer-events: none;
    z-index: 4;
  }
  .verborgen {
    display: none;
  }
  @keyframes puls {
    0%, 100% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.06); }
  }
</style>
