<script lang="ts">
  /** Zonnige heuvelwereld: blauwe lucht, wolken, groene heuvels met een schaakbordpatroon, zwevende ringen. */
  let { accent = '#2563eb' }: { accent?: string } = $props();

  const ringen = Array.from({ length: 9 }, (_, i) => ({
    x: (i * 53 + 8) % 100,
    duur: 12 + (i % 4) * 3,
    vertraging: -((i * 2.9) % 14),
    grootte: 26 + (i % 3) * 10,
  }));

  const wolken = [
    { y: 36, schaal: 1, duur: 70, vertraging: -10 },
    { y: 50, schaal: 0.7, duur: 95, vertraging: -48 },
    { y: 28, schaal: 0.85, duur: 80, vertraging: -30 },
  ];

  const palmen = [4, 31, 63, 90];
</script>

<div class="achtergrond" style="--accent:{accent}">
  <div class="lucht"></div>
  <div class="zon"></div>

  {#each wolken as w}
    <svg class="wolk" viewBox="0 0 200 70" style="top:{w.y}%; transform:scale({w.schaal}); animation-duration:{w.duur}s; animation-delay:{w.vertraging}s" aria-hidden="true">
      <path d="M20 60 a22 22 0 0 1 4 -43 a30 30 0 0 1 56 -8 a26 26 0 0 1 44 12 a24 24 0 0 1 36 18 a14 14 0 0 1 0 21 z" fill="#fff" opacity="0.45" />
    </svg>
  {/each}

  <div class="ringvlucht">
    {#each ringen as r}
      <svg
        viewBox="0 0 40 40"
        style="left:{r.x}%; width:{r.grootte}px; height:{r.grootte}px; animation-duration:{r.duur}s; animation-delay:{r.vertraging}s"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="14" fill="none" stroke="#fbbf24" stroke-width="7" />
        <circle cx="20" cy="20" r="14" fill="none" stroke="#fff7c2" stroke-width="1.4" />
      </svg>
    {/each}
  </div>

  <svg class="heuvels" viewBox="0 0 1280 300" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id="schaak" width="64" height="64" patternUnits="userSpaceOnUse">
        <rect width="64" height="64" fill="#a8641f" />
        <rect width="32" height="32" fill="#8a4f14" />
        <rect x="32" y="32" width="32" height="32" fill="#8a4f14" />
      </pattern>
    </defs>
    <path d="M0 300 V150 C120 90 260 110 380 150 C500 190 600 120 740 100 C880 80 1000 130 1100 150 C1180 165 1240 130 1280 110 V300 Z" fill="#3fa34d" />
    <path d="M0 300 V190 C140 150 300 175 430 200 C560 225 680 170 820 160 C960 150 1100 200 1280 170 V300 Z" fill="#2f8f3e" />
    <path d="M0 300 V235 C160 215 330 240 520 250 C760 262 1000 230 1280 245 V300 Z" fill="url(#schaak)" />
    <path d="M0 235 C160 215 330 240 520 250 C760 262 1000 230 1280 245" fill="none" stroke="#5ccf6a" stroke-width="10" />
  </svg>

  {#each palmen as x}
    <div class="palm" style="left:{x}%">
      <div class="stam"></div>
      <div class="bladeren">
        {#each [-60, -30, 0, 30, 60] as hoek}<i style="transform:rotate({hoek}deg)"></i>{/each}
      </div>
    </div>
  {/each}
  <div class="vloer"></div>
</div>

<style>
  .achtergrond {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
  }
  .lucht {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 50% at 50% 100%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%),
      linear-gradient(180deg, #0a3a9e 0%, #1565d8 45%, #4aa8f5 80%, #8ed0ff 100%);
    transition: background 0.8s;
  }
  .zon {
    position: absolute;
    right: 9%;
    top: 7%;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(circle, #fffbe0 30%, #fde68a 60%, rgba(253, 230, 138, 0) 72%);
    box-shadow: 0 0 80px 30px rgba(253, 230, 138, 0.45);
  }
  .wolk {
    position: absolute;
    left: -240px;
    width: 220px;
    animation: drijf linear infinite;
  }
  @keyframes drijf {
    from { margin-left: 0; }
    to { margin-left: calc(100vw + 480px); }
  }
  .ringvlucht svg {
    position: absolute;
    bottom: -50px;
    opacity: 0;
    filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.9));
    animation: stijg linear infinite;
  }
  @keyframes stijg {
    0% { transform: translateY(0) rotate(0); opacity: 0; }
    10% { opacity: 0.8; }
    50% { transform: translateY(-50vh) translateX(26px) rotate(180deg); }
    90% { opacity: 0.5; }
    100% { transform: translateY(-105vh) translateX(-18px) rotate(360deg); opacity: 0; }
  }
  .heuvels {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 34vh;
  }
  .palm {
    position: absolute;
    bottom: 11vh;
    width: 0;
    height: 0;
  }
  .stam {
    position: absolute;
    left: -5px;
    bottom: 0;
    width: 10px;
    height: 70px;
    border-radius: 5px;
    background: linear-gradient(90deg, #7c4a1e, #a8641f);
    transform: rotate(4deg);
  }
  .bladeren {
    position: absolute;
    left: 0;
    bottom: 66px;
  }
  .bladeren i {
    position: absolute;
    left: -3px;
    bottom: 0;
    width: 6px;
    height: 56px;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(180deg, #5ccf6a, #1f7a2b);
    transform-origin: 50% 100%;
  }
  .vloer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 5vh;
    background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.25));
  }
</style>
