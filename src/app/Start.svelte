<script lang="ts">
  import Heldin from '../art/Held.svelte';
  let { opStart }: { opStart: () => void } = $props();
</script>

<div class="start">
  <div class="glinsters" aria-hidden="true">
    {#each [[18, 14, 0], [80, 10, 0.6], [12, 40, 1.2], [88, 36, 0.3], [30, 6, 0.9], [70, 44, 1.5]] as [x, y, d]}
      <span style="left:{x}%; top:{y}%; animation-delay:{d}s">✦</span>
    {/each}
  </div>
  <h1>
    <span class="klein">Lucas'</span>
    <span class="goudtekst groot">Turbo Missie</span>
  </h1>
  <p class="sub">Letters, woordjes en sommen met Sonic en zijn vrienden</p>

  <div class="groep">
    <div class="d1 plek" style="--kleur:#2563eb"><Heldin wie="sonic" stemming="dans" hoogte={380} /></div>
    <div class="d2 plek" style="--kleur:#f59e0b"><Heldin wie="tails" stemming="dans" hoogte={380} /></div>
    <div class="d3 plek" style="--kleur:#dc2626"><Heldin wie="knuckles" stemming="dans" hoogte={380} /></div>
  </div>

  <button class="knop-goud begin" onclick={opStart}>✨ Tik om te beginnen ✨</button>
</div>

<style>
  .start {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  h1 {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    animation: pop-in 0.8s ease-out;
  }
  .klein {
    font-size: 44px;
    font-weight: 600;
    color: #fde68a;
    text-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
  }
  .groot {
    font-size: 104px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  .sub {
    margin: 4px 0 0;
    font-size: 26px;
    color: #dbeafe;
  }
  .groep {
    display: flex;
    align-items: end;
    gap: 40px;
    margin: 4px 0 10px;
  }
  .plek {
    position: relative;
  }
  .plek::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 4px;
    width: 190px;
    height: 46px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: radial-gradient(ellipse, color-mix(in srgb, var(--kleur) 80%, white), transparent 70%);
    opacity: 0.7;
    filter: blur(2px);
  }
  .glinsters span {
    position: absolute;
    font-size: 34px;
    color: #fde68a;
    text-shadow: 0 0 14px #fbbf24;
    animation: twinkel 2.2s ease-in-out infinite;
  }
  @keyframes twinkel {
    0%, 100% { transform: scale(0.4) rotate(0); opacity: 0.2; }
    50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
  }
  .d1 { animation-delay: 0s; }
  .d2 :global(.lijf) { animation-delay: -0.3s !important; }
  .d3 :global(.lijf) { animation-delay: -0.6s !important; }
  .begin {
    min-height: 88px;
    font-size: 36px;
    padding: 0 48px;
    animation: puls 1.8s ease-in-out infinite;
  }
  @keyframes puls {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
</style>
