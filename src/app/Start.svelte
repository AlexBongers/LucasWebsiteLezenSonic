<script lang="ts">
  import Held from '../art/Held.svelte';
  import Kristal from '../ui/Kristal.svelte';
  import { KRISTAL_KLEUREN } from '../games/kristallen';
  import { vg } from '../store/voortgang.svelte';

  let { opStart }: { opStart: () => void } = $props();

  const regen = Array.from({ length: 16 }, (_, i) => ({
    x: (i * 61 + 4) % 100,
    duur: 6 + (i % 5) * 1.4,
    vertraging: -((i * 1.9) % 9),
    maat: 24 + (i % 3) * 10,
  }));
</script>

<div class="start">
  <div class="straalkrans" aria-hidden="true"></div>

  <div class="regen" aria-hidden="true">
    {#each regen as r}
      <svg viewBox="0 0 40 40" style="left:{r.x}%; width:{r.maat}px; height:{r.maat}px; animation-duration:{r.duur}s; animation-delay:{r.vertraging}s">
        <circle cx="20" cy="20" r="14" fill="none" stroke="#fbbf24" stroke-width="7" />
        <circle cx="20" cy="20" r="14" fill="none" stroke="#fff7c2" stroke-width="1.4" />
      </svg>
    {/each}
  </div>

  <h1>
    <span class="lint">Lucas'</span>
    <span class="goudtekst groot">Turbo Missie</span>
    <span class="strepen" aria-hidden="true"><i></i><i></i><i></i></span>
  </h1>
  <p class="sub">Letters, woordjes en sommen met Sonic en zijn vrienden</p>

  <div class="groep">
    <div class="held links"><Held wie="sonic" stemming="dans" hoogte={380} /></div>
    <div class="held midden"><Held wie="tails" stemming="dans" hoogte={350} /></div>
    <div class="held rechts"><Held wie="knuckles" stemming="dans" hoogte={380} /></div>
  </div>

  {#if vg.kristallen > 0}
    <div class="kristallen" aria-label="{vg.kristallen} turbokristallen">
      {#each KRISTAL_KLEUREN as k, i}<Kristal kleur={k} grootte={26} leeg={i >= vg.kristallen} gloed={i < vg.kristallen} />{/each}
    </div>
  {/if}

  <button class="knop-goud begin icoonknop" onclick={opStart} aria-label="Beginnen">▶️</button>
</div>

<style>
  .start {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 26px;
    gap: 4px;
    overflow: hidden;
  }
  .straalkrans {
    position: absolute;
    left: 50%;
    top: 130px;
    width: 1500px;
    height: 1500px;
    margin: -750px 0 0 -750px;
    background: repeating-conic-gradient(from 0deg, rgba(253, 230, 138, 0.38) 0 5deg, transparent 5deg 15deg);
    mask-image: radial-gradient(circle, #000 4%, transparent 52%);
    animation: draai 60s linear infinite;
  }
  .regen svg {
    position: absolute;
    top: -60px;
    opacity: 0;
    filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.9));
    animation: val linear infinite;
  }
  @keyframes val {
    0% { transform: translateY(0) rotate(0); opacity: 0; }
    10% { opacity: 0.9; }
    90% { opacity: 0.9; }
    100% { transform: translateY(880px) rotate(540deg); opacity: 0; }
  }
  h1 {
    position: relative;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    animation: kom-in 0.9s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .lint {
    padding: 4px 34px;
    border-radius: 12px;
    font-size: 38px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(180deg, #ef4444, #b91c1c);
    border: 3px solid #fff;
    box-shadow: 0 5px 0 #7f1d1d;
    transform: rotate(-3deg);
    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
  }
  .groot {
    margin-top: 4px;
    font-size: 108px;
    font-weight: 700;
    letter-spacing: 1px;
    -webkit-text-stroke: 3px rgba(10, 21, 64, 0.5);
    paint-order: stroke fill;
  }
  .strepen {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 2px;
    align-items: center;
  }
  .strepen i {
    display: block;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(90deg, transparent, #fff, transparent);
    animation: strook 1.6s ease-in-out infinite;
  }
  .strepen i:nth-child(1) { width: 560px; }
  .strepen i:nth-child(2) { width: 400px; animation-delay: 0.2s; }
  .strepen i:nth-child(3) { width: 240px; animation-delay: 0.4s; }
  .sub {
    position: relative;
    margin: 4px 0 0;
    font-size: 26px;
    color: #eff6ff;
    text-shadow: 0 2px 0 rgba(0, 20, 80, 0.6);
  }
  .groep {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 50px;
    margin-top: 8px;
  }
  .held {
    filter: drop-shadow(0 0 0 transparent);
  }
  .links { animation: ren-links 0.95s cubic-bezier(0.2, 0.9, 0.3, 1) backwards 0.2s; }
  .midden { animation: val-van-boven 0.9s cubic-bezier(0.3, 1.4, 0.5, 1) backwards 0.5s; }
  .rechts { animation: ren-rechts 0.95s cubic-bezier(0.2, 0.9, 0.3, 1) backwards 0.35s; }
  .kristallen {
    position: absolute;
    left: 36px;
    bottom: 40px;
    display: flex;
    gap: 6px;
  }
  .begin {
    position: absolute;
    bottom: 34px;
    left: 50%;
    min-height: 90px;
    padding: 0 52px;
    font-size: 38px;
    animation: puls 1.8s ease-in-out infinite;
    transform: translateX(-50%);
  }
  @keyframes draai {
    to { transform: rotate(360deg); }
  }
  @keyframes kom-in {
    from { transform: scale(0.2) rotate(-8deg); opacity: 0; }
  }
  @keyframes strook {
    0%, 100% { opacity: 0.2; transform: scaleX(0.5); }
    50% { opacity: 1; transform: scaleX(1); }
  }
  @keyframes ren-links {
    from { transform: translateX(-900px) skewX(-28deg); opacity: 0; }
    70% { transform: translateX(14px) skewX(6deg); }
  }
  @keyframes ren-rechts {
    from { transform: translateX(900px) skewX(28deg); opacity: 0; }
    70% { transform: translateX(-14px) skewX(-6deg); }
  }
  @keyframes val-van-boven {
    from { transform: translateY(-700px); opacity: 0; }
  }
  @keyframes puls {
    0%, 100% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.06); }
  }
</style>
