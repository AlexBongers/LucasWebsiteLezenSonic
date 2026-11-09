<script lang="ts">
  /**
   * Drie werelden, een per held:
   *  heuvel:     zonnige groene heuvels met schaakbordgrond (Sonic)
   *  werkplaats: zonsondergang boven een vliegveld met tandwielen en een windmolen (Tails)
   *  ruines:     jungle-tempel in de schemering met een drijvend eiland en vuurvliegjes (Knuckles)
   */
  import type { Wereld } from './werelden';

  let { accent = '#2563eb', wereld = 'heuvel' }: { accent?: string; wereld?: Wereld } = $props();

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
  const vogels = [
    { y: 18, duur: 26, vertraging: -4, schaal: 1 },
    { y: 26, duur: 34, vertraging: -17, schaal: 0.7 },
  ];
  const bloemen = [6, 17, 38, 52, 71, 85, 95];
  const palmen = [4, 31, 63, 90];
  const vonken = Array.from({ length: 14 }, (_, i) => ({ x: (i * 37 + 5) % 100, duur: 7 + (i % 5) * 2, vertraging: -((i * 1.7) % 11), maat: 4 + (i % 3) * 2 }));
  const vliegjes = Array.from({ length: 18 }, (_, i) => ({ x: (i * 29 + 7) % 100, y: 38 + ((i * 17) % 52), duur: 5 + (i % 4) * 2, vertraging: -((i * 1.3) % 9) }));
  const tandwiel = (r: number, tanden: number) => {
    const p: string[] = [];
    for (let i = 0; i < tanden * 2; i++) {
      const hoek = (i / (tanden * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * 0.82 : r;
      p.push(`${(Math.cos(hoek) * rr).toFixed(1)},${(Math.sin(hoek) * rr).toFixed(1)}`);
    }
    return p.join(' ');
  };
</script>

<div class="achtergrond" style="--accent:{accent}">
  {#key wereld}
    <div class="scene {wereld}">
      {#if wereld === 'heuvel'}
        <div class="lucht heuvel-lucht"></div>
        <div class="zon"></div>
        {#each wolken as w}
          <svg class="wolk" viewBox="0 0 200 70" style="top:{w.y}%; transform:scale({w.schaal}); animation-duration:{w.duur}s; animation-delay:{w.vertraging}s" aria-hidden="true">
            <path d="M20 60 a22 22 0 0 1 4 -43 a30 30 0 0 1 56 -8 a26 26 0 0 1 44 12 a24 24 0 0 1 36 18 a14 14 0 0 1 0 21 z" fill="#fff" opacity="0.45" />
          </svg>
        {/each}
        {#each vogels as v}
          <svg class="vogel" viewBox="0 0 40 16" style="top:{v.y}%; width:{40 * v.schaal}px; animation-duration:{v.duur}s; animation-delay:{v.vertraging}s" aria-hidden="true">
            <path d="M2 10 Q10 -2 20 9 Q30 -2 38 10" fill="none" stroke="#0a2a6e" stroke-width="2.6" stroke-linecap="round" />
          </svg>
        {/each}
        <div class="ringvlucht">
          {#each ringen as r}
            <svg viewBox="0 0 40 40" style="left:{r.x}%; width:{r.grootte}px; height:{r.grootte}px; animation-duration:{r.duur}s; animation-delay:{r.vertraging}s" aria-hidden="true">
              <circle cx="20" cy="20" r="14" fill="none" stroke="#fbbf24" stroke-width="7" />
              <circle cx="20" cy="20" r="14" fill="none" stroke="#fff7c2" stroke-width="1.4" />
            </svg>
          {/each}
        </div>
        <svg class="berg" viewBox="0 0 1280 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 300 V190 L120 120 L210 170 L330 80 L440 160 L560 110 L700 190 L830 100 L960 170 L1080 120 L1280 190 V300 Z" fill="#2c64c8" opacity="0.55" />
        </svg>
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
            <div class="bladeren">{#each [-60, -30, 0, 30, 60] as hoek}<i style="transform:rotate({hoek}deg)"></i>{/each}</div>
          </div>
        {/each}
        {#each bloemen as x, i}
          <div class="bloem" style="left:{x}%; animation-delay:{-i * 0.7}s"><i></i><b></b></div>
        {/each}
      {:else if wereld === 'werkplaats'}
        <div class="lucht werk-lucht"></div>
        <div class="zon avond"></div>
        {#each wolken as w}
          <svg class="wolk" viewBox="0 0 200 70" style="top:{w.y - 8}%; transform:scale({w.schaal}); animation-duration:{w.duur}s; animation-delay:{w.vertraging}s" aria-hidden="true">
            <path d="M20 60 a22 22 0 0 1 4 -43 a30 30 0 0 1 56 -8 a26 26 0 0 1 44 12 a24 24 0 0 1 36 18 a14 14 0 0 1 0 21 z" fill="#ffd2b0" opacity="0.4" />
          </svg>
        {/each}
        <!-- een klein vliegtuigje trekt voorbij -->
        <svg class="vliegtuig" viewBox="0 0 120 60" aria-hidden="true">
          <path d="M6 30 H34" stroke="#fff" stroke-opacity="0.5" stroke-width="3" stroke-dasharray="6 6" />
          <path d="M34 26 H92 Q106 28 108 32 Q106 36 92 38 H34 Z" fill="#f97316" stroke="#0a1540" stroke-width="3" stroke-linejoin="round" />
          <path d="M44 22 H84 M44 44 H84" stroke="#0a1540" stroke-width="4" stroke-linecap="round" />
          <path d="M36 28 L26 16 L34 16 L44 28 Z" fill="#dc2626" stroke="#0a1540" stroke-width="2.5" stroke-linejoin="round" />
          <circle cx="108" cy="32" r="3" fill="#0a1540" />
          <ellipse class="schroef" cx="110" cy="32" rx="2.5" ry="12" fill="#cbd5e1" stroke="#0a1540" stroke-width="2" />
        </svg>
        <div class="vonkenvlucht">
          {#each vonken as v}<i style="left:{v.x}%; width:{v.maat}px; height:{v.maat}px; animation-duration:{v.duur}s; animation-delay:{v.vertraging}s"></i>{/each}
        </div>
        <svg class="skyline" viewBox="0 0 1280 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 300 V190 H70 V150 H130 V190 H210 L250 140 L290 190 H380 V130 H420 V190 H520 V170 Q560 120 600 170 V190 H700 V140 H720 V100 H760 V140 H780 V190 H900 L960 120 L1020 190 H1120 V160 H1190 V190 H1280 V300 Z" fill="#3a2a6e" opacity="0.85" />
        </svg>
        <!-- windmolen -->
        <svg class="molen" viewBox="0 0 120 160" aria-hidden="true">
          <path d="M50 150 L56 70 H64 L70 150 Z" fill="#2a1d55" stroke="#0a1540" stroke-width="3" stroke-linejoin="round" />
          <g class="wieken" style="transform-origin:60px 66px">
            {#each [0, 90, 180, 270] as h}<path d="M60 66 L52 6 L68 6 Z" fill="#f5d0a8" stroke="#0a1540" stroke-width="2.5" stroke-linejoin="round" transform="rotate({h} 60 66)" />{/each}
          </g>
          <circle cx="60" cy="66" r="7" fill="#f97316" stroke="#0a1540" stroke-width="3" />
        </svg>
        <!-- tandwielen -->
        <svg class="wiel w1" viewBox="-70 -70 140 140" aria-hidden="true"><polygon points={tandwiel(60, 12)} fill="#5b3b8c" stroke="#0a1540" stroke-width="4" /><circle r="22" fill="#2a1d55" stroke="#0a1540" stroke-width="4" /></svg>
        <svg class="wiel w2" viewBox="-70 -70 140 140" aria-hidden="true"><polygon points={tandwiel(60, 9)} fill="#7a4fb0" stroke="#0a1540" stroke-width="4" /><circle r="20" fill="#2a1d55" stroke="#0a1540" stroke-width="4" /></svg>
        <svg class="wiel w3" viewBox="-70 -70 140 140" aria-hidden="true"><polygon points={tandwiel(60, 14)} fill="#4a2f7a" stroke="#0a1540" stroke-width="4" /><circle r="24" fill="#2a1d55" stroke="#0a1540" stroke-width="4" /></svg>
        <svg class="grond-werk" viewBox="0 0 1280 200" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="strepen" width="56" height="20" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
              <rect width="28" height="20" fill="#fbbf24" /><rect x="28" width="28" height="20" fill="#1f1636" />
            </pattern>
            <pattern id="plaat" width="80" height="60" patternUnits="userSpaceOnUse">
              <rect width="80" height="60" fill="#3d2c63" /><rect x="3" y="3" width="74" height="54" fill="none" stroke="#5a4488" stroke-width="3" />
              <circle cx="10" cy="10" r="3" fill="#7a63a8" /><circle cx="70" cy="10" r="3" fill="#7a63a8" /><circle cx="10" cy="50" r="3" fill="#7a63a8" /><circle cx="70" cy="50" r="3" fill="#7a63a8" />
            </pattern>
          </defs>
          <rect y="40" width="1280" height="160" fill="url(#plaat)" />
          <rect y="26" width="1280" height="18" fill="url(#strepen)" stroke="#0a1540" stroke-width="3" />
        </svg>
      {:else}
        <div class="lucht ruine-lucht"></div>
        <div class="maan"></div>
        <svg class="berg" viewBox="0 0 1280 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 300 V170 L90 70 L180 150 L290 40 L400 150 L520 90 L650 170 L780 60 L910 160 L1040 80 L1160 150 L1280 100 V300 Z" fill="#0f5d6e" opacity="0.75" />
          <path d="M0 300 V210 L140 140 L260 200 L400 120 L560 210 L700 150 L860 215 L1000 140 L1160 205 L1280 160 V300 Z" fill="#0b4a5c" opacity="0.9" />
        </svg>
        <!-- drijvend eiland -->
        <svg class="eiland-lucht" viewBox="0 0 220 180" aria-hidden="true">
          <path d="M20 70 H200 Q196 98 168 108 Q150 140 118 168 Q104 140 90 118 Q40 112 20 70 Z" fill="#5a4a3a" stroke="#0a1540" stroke-width="4" stroke-linejoin="round" />
          <path d="M14 72 Q30 36 70 34 Q110 6 150 34 Q192 36 206 72 Z" fill="#3fa34d" stroke="#0a1540" stroke-width="4" stroke-linejoin="round" />
          <path d="M100 100 V168" stroke="#7dd3fc" stroke-width="7" stroke-linecap="round" opacity="0.7" />
        </svg>
        <!-- tempel -->
        <svg class="tempel" viewBox="0 0 400 260" aria-hidden="true">
          <path d="M20 260 V230 H70 V200 H120 V170 H170 V140 H230 V170 H280 V200 H330 V230 H380 V260 Z" fill="#1b4f55" stroke="#0a1540" stroke-width="4" stroke-linejoin="round" />
          <path d="M150 140 V80 H170 V140 M230 140 V80 H250 V140" stroke="#0a1540" stroke-width="4" fill="#256a70" />
          <path d="M140 80 H260 L200 40 Z" fill="#1b4f55" stroke="#0a1540" stroke-width="4" stroke-linejoin="round" />
          <path class="kristal" d="M200 6 L214 26 L206 52 H194 L186 26 Z" fill="#4ade80" stroke="#0a1540" stroke-width="3" stroke-linejoin="round" />
          <path d="M60 232 V260 M110 202 V260" stroke="#4ade80" stroke-width="3" opacity="0.5" />
        </svg>
        <div class="vliegjes">
          {#each vliegjes as v}<i style="left:{v.x}%; top:{v.y}%; animation-duration:{v.duur}s; animation-delay:{v.vertraging}s"></i>{/each}
        </div>
        <svg class="grond-ruine" viewBox="0 0 1280 200" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="blok" width="120" height="64" patternUnits="userSpaceOnUse">
              <rect width="120" height="64" fill="#3c5a50" /><rect x="3" y="3" width="114" height="58" rx="6" fill="#4b6e62" stroke="#2a4038" stroke-width="3" />
              <path d="M20 20 H46 M70 40 H100" stroke="#4ade80" stroke-width="3" stroke-linecap="round" opacity="0.55" />
            </pattern>
          </defs>
          <rect y="32" width="1280" height="168" fill="url(#blok)" />
          <path d="M0 32 Q60 14 120 32 T240 32 T360 32 T480 32 T600 32 T720 32 T840 32 T960 32 T1080 32 T1200 32 T1320 32 V50 H0 Z" fill="#3fa34d" stroke="#1f5a29" stroke-width="3" />
        </svg>
        <svg class="liaan l1" viewBox="0 0 60 300" aria-hidden="true"><path d="M30 0 C10 60 50 100 28 170 C14 210 40 250 30 300" fill="none" stroke="#2f8f3e" stroke-width="7" stroke-linecap="round" /><circle cx="22" cy="80" r="7" fill="#4ade80" /><circle cx="36" cy="150" r="7" fill="#4ade80" /><circle cx="28" cy="230" r="7" fill="#4ade80" /></svg>
        <svg class="liaan l2" viewBox="0 0 60 300" aria-hidden="true"><path d="M30 0 C50 50 10 110 32 180 C46 220 22 260 30 300" fill="none" stroke="#2f8f3e" stroke-width="7" stroke-linecap="round" /><circle cx="40" cy="70" r="7" fill="#4ade80" /><circle cx="24" cy="160" r="7" fill="#4ade80" /></svg>
      {/if}
      <div class="vloer"></div>
    </div>
  {/key}
</div>

<style>
  .achtergrond {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
    background: #0a3a9e;
  }
  .scene {
    position: absolute;
    inset: 0;
    animation: scene-in 0.9s ease-out;
  }
  @keyframes scene-in {
    from { opacity: 0; transform: scale(1.04); }
  }
  .lucht {
    position: absolute;
    inset: 0;
    transition: background 0.8s;
  }
  .heuvel-lucht {
    background:
      radial-gradient(ellipse 70% 50% at 50% 100%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%),
      linear-gradient(180deg, #0a3a9e 0%, #1565d8 45%, #4aa8f5 80%, #8ed0ff 100%);
  }
  .werk-lucht {
    background: linear-gradient(180deg, #2b2a7a 0%, #6d3fa0 32%, #d9567e 62%, #ff9a5a 88%, #ffd08a 100%);
  }
  .ruine-lucht {
    background:
      radial-gradient(ellipse 60% 40% at 50% 100%, rgba(74, 222, 128, 0.35), transparent 70%),
      linear-gradient(180deg, #06263a 0%, #0b4a5c 40%, #178a82 75%, #6fd3a8 100%);
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
  .zon.avond {
    right: 12%;
    top: 40%;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, #fff3c4 20%, #ff9a5a 55%, rgba(255, 120, 80, 0) 72%);
    box-shadow: 0 0 120px 50px rgba(255, 140, 90, 0.5);
  }
  .maan {
    position: absolute;
    left: 10%;
    top: 9%;
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #f0fdf4, #bbf7d0 70%);
    box-shadow: 0 0 60px 20px rgba(187, 247, 208, 0.35);
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
  .vogel {
    position: absolute;
    left: -60px;
    animation: vlieg linear infinite;
  }
  @keyframes vlieg {
    from { transform: translateX(0) translateY(0); }
    50% { transform: translateX(55vw) translateY(-26px); }
    to { transform: translateX(calc(100vw + 120px)) translateY(10px); }
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
  .berg {
    position: absolute;
    left: 0;
    bottom: 22vh;
    width: 100%;
    height: 30vh;
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
  .bloem {
    position: absolute;
    bottom: 8.5vh;
    width: 0;
    height: 0;
    transform-origin: 0 0;
    animation: zwaai 3s ease-in-out infinite alternate;
  }
  .bloem i {
    position: absolute;
    left: -2px;
    bottom: 0;
    width: 4px;
    height: 46px;
    border-radius: 2px;
    background: #2f8f3e;
    transform-origin: 50% 100%;
  }
  .bloem b {
    position: absolute;
    left: -13px;
    bottom: 38px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: radial-gradient(circle, #7c2d12 22%, #fbbf24 24%, #fde047 70%);
    box-shadow: 0 0 0 3px #f59e0b;
  }
  @keyframes zwaai {
    from { transform: rotate(-5deg); }
    to { transform: rotate(5deg); }
  }
  /* werkplaats */
  .vliegtuig {
    position: absolute;
    left: -160px;
    top: 14%;
    width: 130px;
    animation: voorbij 24s linear infinite;
    filter: drop-shadow(0 6px 6px rgba(0, 0, 40, 0.35));
  }
  .schroef {
    animation: draaien 0.12s linear infinite;
    transform-origin: 110px 32px;
  }
  @keyframes voorbij {
    from { transform: translateX(0) translateY(0) rotate(-3deg); }
    50% { transform: translateX(55vw) translateY(24px) rotate(2deg); }
    to { transform: translateX(calc(100vw + 340px)) translateY(-12px) rotate(-3deg); }
  }
  @keyframes draaien {
    50% { transform: scaleY(0.3); }
  }
  .vonkenvlucht i {
    position: absolute;
    bottom: 18vh;
    border-radius: 50%;
    background: #fdba74;
    box-shadow: 0 0 10px 3px rgba(251, 146, 60, 0.9);
    opacity: 0;
    animation: vonk linear infinite;
  }
  @keyframes vonk {
    0% { transform: translateY(0); opacity: 0; }
    15% { opacity: 1; }
    100% { transform: translateY(-62vh) translateX(30px); opacity: 0; }
  }
  .skyline {
    position: absolute;
    left: 0;
    bottom: 17vh;
    width: 100%;
    height: 30vh;
  }
  .molen {
    position: absolute;
    left: 68%;
    bottom: 21vh;
    width: 120px;
  }
  .wieken {
    animation: draaien-langzaam 7s linear infinite;
    transform-box: view-box;
  }
  @keyframes draaien-langzaam {
    to { transform: rotate(360deg); }
  }
  .wiel {
    position: absolute;
    opacity: 0.55;
    animation: draaien-langzaam 40s linear infinite;
  }
  .w1 { left: -50px; top: 38%; width: 190px; }
  .w2 { left: 130px; top: 46%; width: 120px; animation-direction: reverse; animation-duration: 28s; }
  .w3 { right: -60px; top: 18%; width: 210px; animation-duration: 55s; }
  .grond-werk {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 24vh;
  }
  /* ruïnes */
  .eiland-lucht {
    position: absolute;
    right: 14%;
    top: 14%;
    width: 200px;
    animation: bob 6s ease-in-out infinite;
    filter: drop-shadow(0 10px 8px rgba(0, 20, 30, 0.45));
  }
  @keyframes bob {
    50% { transform: translateY(-16px); }
  }
  .tempel {
    position: absolute;
    left: 50%;
    bottom: 21vh;
    width: 520px;
    margin-left: -260px;
    opacity: 0.9;
  }
  .kristal {
    animation: gloed 2s ease-in-out infinite;
    filter: drop-shadow(0 0 10px #4ade80);
  }
  @keyframes gloed {
    50% { filter: drop-shadow(0 0 22px #bbf7d0); }
  }
  .vliegjes i {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fef08a;
    box-shadow: 0 0 12px 4px rgba(254, 240, 138, 0.9);
    animation: dwaal ease-in-out infinite alternate;
  }
  @keyframes dwaal {
    from { transform: translate(0, 0); opacity: 0.2; }
    50% { opacity: 1; }
    to { transform: translate(40px, -30px); opacity: 0.3; }
  }
  .grond-ruine {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 24vh;
  }
  .liaan {
    position: absolute;
    top: 0;
    width: 56px;
    height: 280px;
    transform-origin: 50% 0;
    animation: zwaai 4s ease-in-out infinite alternate;
  }
  .l1 { left: 3%; }
  .l2 { right: 6%; animation-delay: -2s; }
  .vloer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 5vh;
    background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.25));
  }
  @media (prefers-reduced-motion: reduce) {
    .wolk, .vogel, .vliegtuig, .wieken, .wiel, .eiland-lucht, .vliegjes i, .vonkenvlucht i, .ringvlucht svg { animation: none; }
  }
</style>
