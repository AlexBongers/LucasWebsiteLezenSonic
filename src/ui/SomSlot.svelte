<script lang="ts">
  /**
   * Een slot op een groep 3-spel: eerst een moeilijke som (over het tiental heen, tot 20) oplossen.
   * De som wordt voorgelezen; bij een fout komt er een nieuwe som.
   */
  import { onMount } from 'svelte';
  import { somDelen, spreek, stopSpreken } from '../audio/stem';
  import { speelBijna, speelGoed, speelKristal } from '../audio/geluid';
  import { glitterOp } from './feest';
  import { schud as hussel } from '../engine/toeval';
  import teksten from '../../content/teksten.json';

  let { opOpen, opSluit }: { opOpen: () => void; opSluit: () => void } = $props();

  type Som = { a: number; op: '+' | '-'; b: number; antwoord: number; keuzes: number[] };
  const tussen = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

  /** Plus of min over het tiental: 8 + 5, 13 - 6. */
  function nieuweSom(): Som {
    let a: number, b: number, op: '+' | '-', antwoord: number;
    if (Math.random() < 0.5) {
      op = '+';
      do {
        a = tussen(5, 9);
        b = tussen(3, 9);
      } while (a + b <= 10);
      antwoord = a + b;
    } else {
      op = '-';
      do {
        a = tussen(11, 18);
        b = tussen(3, 9);
      } while (a - b >= 10 || a - b < 1);
      antwoord = a - b;
    }
    const af = hussel([antwoord - 1, antwoord + 1, antwoord - 2, antwoord + 2].filter((x) => x >= 0 && x <= 20)).slice(0, 2);
    return { a, op, b, antwoord, keuzes: hussel([antwoord, ...af]) };
  }

  let som: Som = $state(nieuweSom());
  let fout: number[] = $state([]);
  let open = $state(false);
  let slotEl: HTMLElement | undefined = $state();

  const zeg = () => spreek(somDelen(som.a, som.op, som.b), 'getal');

  onMount(() => {
    void (async () => {
      await spreek(teksten.slot.start);
      await zeg();
    })();
    return () => stopSpreken();
  });

  async function kies(n: number) {
    if (open || fout.includes(n)) return;
    if (n === som.antwoord) {
      open = true;
      speelGoed();
      setTimeout(speelKristal, 300);
      glitterOp(slotEl ?? null);
      await spreek(somDelen(som.a, som.op, som.b, som.antwoord), 'getal');
      await spreek(teksten.slot.goed);
      opOpen();
    } else {
      speelBijna();
      fout = [...fout, n];
      await spreek(teksten.slot.fout);
      som = nieuweSom();
      fout = [];
      await zeg();
    }
  }
</script>

<div class="laag" role="dialog" aria-label="Los eerst de som op">
  <div class="vak">
    <button class="dicht knop-rond" onclick={opSluit} aria-label="Terug">✕</button>
    <div class="slot" class:open bind:this={slotEl} aria-hidden="true">{open ? '🔓' : '🔒'}</div>
    <div class="som">
      <span>{som.a}</span><span class="teken">{som.op === '+' ? '+' : '−'}</span><span>{som.b}</span><span class="teken">=</span><span class="vraag">?</span>
      <button class="luid" onclick={zeg} aria-label="Zeg de som nog eens">🔊</button>
    </div>
    <div class="keuzes">
      {#each som.keuzes as k, i (som.a + som.op + som.b + k)}
        <button class="getal" class:uit={fout.includes(k)} style="--kleur:{['#ef4444', '#3b82f6', '#22c55e'][i]}" onclick={() => kies(k)} aria-label="Antwoord {k}">{k}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .laag {
    position: fixed;
    inset: 0;
    z-index: 85;
    display: grid;
    place-items: center;
    background: radial-gradient(circle, rgba(30, 41, 59, 0.9), rgba(2, 6, 23, 0.95));
    animation: in 0.3s ease-out;
  }
  .vak {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 30px 60px 40px;
    border-radius: 40px;
    background: linear-gradient(160deg, #475569, #1e293b);
    border: 6px solid #fbbf24;
    box-shadow: 0 0 50px rgba(251, 191, 36, 0.5);
  }
  .dicht {
    position: absolute;
    left: -24px;
    top: -24px;
    font-size: 28px;
  }
  .slot {
    font-size: 110px;
    line-height: 1;
    font-family: 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
    animation: wiebel 1.6s ease-in-out infinite;
  }
  .slot.open {
    animation: pop-in 0.5s ease-out;
  }
  .som {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 10px 30px;
    border-radius: 26px;
    background: #0f172a;
    font-family: var(--font-lees);
    font-size: 96px;
    font-weight: 700;
    color: #fde68a;
  }
  .teken {
    color: #93c5fd;
  }
  .vraag {
    color: #4ade80;
    animation: puls 1.1s ease-in-out infinite;
  }
  .luid {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    font-size: 34px;
    background: rgba(255, 255, 255, 0.9);
  }
  .keuzes {
    display: flex;
    gap: 30px;
  }
  .getal {
    min-width: 170px;
    height: 130px;
    border-radius: 28px;
    border: 5px solid #fff;
    font-family: var(--font-lees);
    font-size: 86px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(180deg, color-mix(in srgb, var(--kleur) 80%, #fff), var(--kleur));
    box-shadow: 0 8px 0 color-mix(in srgb, var(--kleur) 50%, #000);
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
  }
  .getal:active {
    transform: translateY(5px);
  }
  .getal.uit {
    filter: grayscale(1) brightness(0.6);
  }
  @keyframes wiebel {
    0%, 100% { transform: rotate(-6deg); }
    50% { transform: rotate(6deg); }
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.12); }
  }
  @keyframes in {
    from { opacity: 0; }
  }
</style>
