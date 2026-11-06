<script lang="ts">
  /**
   * Kleine boze robots (eigen ontwerp) die de antwoorden dragen of in de weg staan.
   * soort: 0 rond, 1 vierkant, 2 koepel met propeller, 3 stekelbol. kapot: ontploft en valt uit elkaar.
   */
  let { soort = 0, grootte = 110, kapot = false }: { soort?: number; grootte?: number; kapot?: boolean } = $props();
  const kleur = $derived(['#64748b', '#0ea5e9', '#a855f7', '#f97316'][soort % 4]);
  const donker = $derived(['#334155', '#0369a1', '#6b21a8', '#c2410c'][soort % 4]);
  const id = `r${Math.random().toString(36).slice(2, 8)}`;
</script>

<svg class="robot" class:kapot viewBox="0 0 120 120" style="width:{grootte}px;height:{grootte}px" aria-hidden="true">
  <defs>
    <radialGradient id="{id}-m" cx="0.35" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#fff" stop-opacity="0.65" />
      <stop offset="0.4" stop-color={kleur} />
      <stop offset="1" stop-color={donker} />
    </radialGradient>
  </defs>
  <g class="lijf">
    <!-- antenne of propeller -->
    {#if soort === 2}
      <rect x="57" y="8" width="6" height="16" fill="#475569" />
      <ellipse class="prop" cx="60" cy="8" rx="30" ry="4" fill="#cbd5e1" stroke="#0a1540" stroke-width="2" />
    {:else}
      <path d="M60 22 L60 8" stroke="#0a1540" stroke-width="5" stroke-linecap="round" />
      <circle class="knop" cx="60" cy="7" r="6" fill="#ef4444" stroke="#0a1540" stroke-width="2.5" />
    {/if}

    <!-- voeten -->
    <ellipse cx="38" cy="108" rx="16" ry="8" fill="#334155" stroke="#0a1540" stroke-width="3" />
    <ellipse cx="82" cy="108" rx="16" ry="8" fill="#334155" stroke="#0a1540" stroke-width="3" />

    <!-- lijf -->
    {#if soort === 1}
      <rect x="20" y="24" width="80" height="78" rx="16" fill="url(#{id}-m)" stroke="#0a1540" stroke-width="4" />
    {:else if soort === 2}
      <path d="M18 98 C14 50 40 24 60 24 C80 24 106 50 102 98 Z" fill="url(#{id}-m)" stroke="#0a1540" stroke-width="4" />
    {:else if soort === 3}
      <path d="M60 18 L68 30 L84 22 L84 38 L100 40 L92 54 L106 66 L92 76 L98 92 L82 92 L76 104 L60 96 L44 104 L38 92 L22 92 L28 76 L14 66 L28 54 L20 40 L36 38 L36 22 L52 30 Z" fill="url(#{id}-m)" stroke="#0a1540" stroke-width="4" stroke-linejoin="round" />
    {:else}
      <circle cx="60" cy="64" r="42" fill="url(#{id}-m)" stroke="#0a1540" stroke-width="4" />
    {/if}

    <!-- gezicht: boze rode ogen -->
    <ellipse cx="44" cy="62" rx="11" ry="13" fill="#fff" stroke="#0a1540" stroke-width="3" />
    <ellipse cx="76" cy="62" rx="11" ry="13" fill="#fff" stroke="#0a1540" stroke-width="3" />
    <circle class="pupil" cx="47" cy="64" r="5.5" fill="#dc2626" />
    <circle class="pupil" cx="73" cy="64" r="5.5" fill="#dc2626" />
    <path d="M30 46 L54 54 M90 46 L66 54" stroke="#0a1540" stroke-width="5" stroke-linecap="round" />
    <path d="M42 86 L50 82 L58 86 L66 82 L74 86 L78 90 L42 90 Z" fill="#fff" stroke="#0a1540" stroke-width="2.5" stroke-linejoin="round" />
  </g>
</svg>

<style>
  .robot {
    overflow: visible;
    filter: drop-shadow(0 6px 8px rgba(0, 0, 40, 0.4));
  }
  .lijf {
    transform-origin: 60px 100px;
    transform-box: view-box;
    animation: wiebel 1.4s ease-in-out infinite;
  }
  .prop {
    transform-origin: 60px 8px;
    transform-box: view-box;
    animation: draai 0.25s linear infinite;
  }
  .knop {
    animation: knipper 1.2s ease-in-out infinite;
  }
  .kapot {
    animation: ontplof 0.55s ease-in forwards;
  }
  @keyframes wiebel {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg) translateY(-3px); }
  }
  @keyframes draai {
    from { transform: scaleX(1); }
    50% { transform: scaleX(0.3); }
    to { transform: scaleX(1); }
  }
  @keyframes knipper {
    50% { fill: #fca5a5; }
  }
  @keyframes ontplof {
    0% { transform: scale(1) rotate(0); opacity: 1; filter: brightness(1); }
    30% { transform: scale(1.35) rotate(-8deg); filter: brightness(2.2) saturate(0.3); opacity: 1; }
    100% { transform: scale(0.1) rotate(120deg) translateY(-60px); opacity: 0; }
  }
</style>
