<script lang="ts">
  /** Een dagmissie is gelukt: een nieuw turbokristal! Bij het zevende wordt Lucas superheld. */
  import { onMount } from 'svelte';
  import Held from '../art/Held.svelte';
  import Kristal from '../ui/Kristal.svelte';
  import { AANTAL_KRISTALLEN, KRISTAL_KLEUREN } from '../games/kristallen';
  import { speelFanfare, speelKristal } from '../audio/geluid';
  import { spreek } from '../audio/stem';
  import { grootFeest } from '../ui/feest';
  import teksten from '../../content/teksten.json';
  import RingTeller from '../ui/RingTeller.svelte';
  import { vg } from '../store/voortgang.svelte';
  import { RINGEN_KRISTAL } from '../games/winkel';
  import { speelRing } from '../audio/geluid';

  let { nummer, opSluit }: { nummer: number; opSluit: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const alle = nummer >= AANTAL_KRISTALLEN;
  // svelte-ignore state_referenced_locally
  const kleur = KRISTAL_KLEUREN[Math.max(0, nummer - 1)];

  onMount(() => {
    speelKristal();
    setTimeout(speelFanfare, 700);
    grootFeest();
    void (async () => {
      await spreek(alle ? teksten.missie.alle : teksten.missie.klaar);
      // En de extra ringen die erbij horen.
      speelRing();
      await spreek(teksten.winkel.krijgt);
      await spreek(String(RINGEN_KRISTAL), 'getal');
      await spreek(teksten.winkel.ringenJuich);
    })();
  });
</script>

<div class="scherm" class:alle style="--kleur:{kleur}">
  <div class="straal" aria-hidden="true"></div>

  <h1 class="goudtekst">{alle ? 'SUPERHELD!' : 'Missie gelukt!'}</h1>

  <div class="steen">
    <Kristal {kleur} grootte={190} />
    <span class="ster s1">✦</span><span class="ster s2">✦</span><span class="ster s3">✦</span>
  </div>

  <p class="telling">Turbokristal <strong>{nummer}</strong> van {AANTAL_KRISTALLEN}!</p>
  <div class="extra"><span>+{RINGEN_KRISTAL} ringen</span><RingTeller aantal={vg.ringen} /></div>

  <div class="rij">
    {#each KRISTAL_KLEUREN as k, i}
      <div class="plek" class:nieuw={i === nummer - 1} style="animation-delay:{i * 0.06}s">
        <Kristal kleur={k} grootte={52} leeg={i >= nummer} />
      </div>
    {/each}
  </div>

  <div class="helden">
    <Held wie="sonic" stemming="juich" hoogte={230} />
    <Held wie="tails" stemming="dans" hoogte={210} />
    <Held wie="knuckles" stemming="juich" hoogte={230} />
  </div>

  <button class="knop-goud verder icoonknop" onclick={opSluit} aria-label="Verder">➡️</button>
</div>

<style>
  .extra {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 36px;
    font-weight: 700;
    color: #fde047;
    animation: pop-in 0.6s ease-out 1s backwards;
  }
  .scherm {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding-top: 22px;
    background: radial-gradient(ellipse at 50% 38%, color-mix(in srgb, var(--kleur) 42%, transparent), rgba(3, 18, 60, 0.82) 70%);
    animation: fade 0.4s ease-out;
  }
  .straal {
    position: absolute;
    left: 50%;
    top: 270px;
    width: 1100px;
    height: 1100px;
    margin: -550px 0 0 -550px;
    background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--kleur) 55%, transparent) 0 6deg, transparent 6deg 18deg);
    mask-image: radial-gradient(circle, #000 5%, transparent 62%);
    animation: draai 22s linear infinite;
    opacity: 0.65;
  }
  h1 {
    position: relative;
    margin: 0;
    font-size: 76px;
    animation: pop-in 0.7s ease-out;
  }
  .steen {
    position: relative;
    margin-top: 6px;
    animation: zweef 2.4s ease-in-out infinite, kom 0.9s cubic-bezier(0.3, 1.6, 0.5, 1) backwards 0.2s;
  }
  .ster {
    position: absolute;
    color: #fff7c2;
    font-size: 34px;
    text-shadow: 0 0 14px #fde047;
    animation: twinkel 1.6s ease-in-out infinite;
  }
  .s1 { left: -46px; top: 20px; }
  .s2 { right: -40px; top: 70px; animation-delay: 0.5s; }
  .s3 { right: 20px; top: -22px; animation-delay: 1s; }
  .telling {
    position: relative;
    margin: 4px 0 0;
    font-size: 36px;
    font-weight: 600;
  }
  .telling strong {
    color: #fde68a;
    font-size: 46px;
  }
  .rij {
    position: relative;
    display: flex;
    gap: 12px;
    margin-top: 6px;
  }
  .plek {
    animation: pop-in 0.4s ease-out backwards;
  }
  .plek.nieuw {
    animation: pop-in 0.7s ease-out 0.5s backwards, puls 1.2s ease-in-out 1.2s infinite;
  }
  .helden {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 60px;
    pointer-events: none;
  }
  .verder {
    position: absolute;
    bottom: 36px;
    left: 50%;
    transform: translateX(-50%);
    min-width: 260px;
  }
  .alle h1 {
    font-size: 92px;
  }
  @keyframes draai {
    to { transform: rotate(360deg); }
  }
  @keyframes zweef {
    0%, 100% { transform: translateY(0) rotate(-3deg); }
    50% { transform: translateY(-16px) rotate(3deg); }
  }
  @keyframes kom {
    from { transform: scale(0.1) rotate(-200deg); opacity: 0; }
  }
  @keyframes twinkel {
    0%, 100% { transform: scale(0.4) rotate(0); opacity: 0.3; }
    50% { transform: scale(1.3) rotate(45deg); opacity: 1; }
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.25); }
  }
  @keyframes fade {
    from { opacity: 0; }
  }
</style>
