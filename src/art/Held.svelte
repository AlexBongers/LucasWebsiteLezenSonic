<script lang="ts">
  /**
   * De drie helden, getekend in een stoere stripstijl met hun herkenbare kenmerken:
   *  Sonic:    blauwe egel met stekels naar achteren, rode sneakers, witte handschoenen
   *  Tails:    oranje vos met twee staarten, witte buik, rood-witte sneakers
   *  Knuckles: rode stekelvarken met grote vuisten met stekels en een wit halvemaantje op zijn borst
   * Eigen tekeningen, geen officiële afbeeldingen.
   * stemming: 'rust' (zacht wiegen), 'dans', 'juich' (springen), 'denk' (hoofd schuin)
   */
  import type { HeldId } from '../games/spellen';
  import { vg } from '../store/voortgang.svelte';
  import { SCHOEN, type Kleding } from '../games/kleding';

  let {
    wie,
    stemming = 'rust',
    hoogte = 320,
    kleding,
  }: { wie: HeldId; stemming?: 'rust' | 'dans' | 'juich' | 'denk'; hoogte?: number; kleding?: Kleding } = $props();

  const STIJL = {
    sonic: { huid: '#2563eb', licht: '#60a5fa', donker: '#1e40af', iris: '#16a34a', schoen: '#dc2626', schaal: 1 },
    tails: { huid: '#f59e0b', licht: '#fcd34d', donker: '#b45309', iris: '#2563eb', schoen: '#dc2626', schaal: 0.92 },
    knuckles: { huid: '#dc2626', licht: '#f87171', donker: '#991b1b', iris: '#7c3aed', schoen: '#65a30d', schaal: 1.04 },
  } as const;

  let s = $derived(STIJL[wie]);
  /** Superhelden uit de winkel: goud met een gloed. */
  let goud = $derived(vg.winkel.gekozen.held === 'super');
  /** Wat hij aan heeft uit de kleedkamer (of wat Lucas aan het passen is). */
  let kl = $derived(kleding ?? vg.winkel.kleding?.[wie] ?? { hoofd: '', bril: '', schoen: '', rug: '' });
  let schoen = $derived(SCHOEN[kl.schoen] ?? [s.schoen, '#7f1d1d']);
  const id = `h${Math.random().toString(36).slice(2, 8)}`;
  let zingt = $derived(stemming === 'juich' || stemming === 'dans');
  const PEACH = '#fbd5a8';
  const PEACH_SCHADUW = '#eab07a';
</script>

<svg class="held {stemming}" class:goud viewBox="-6 -6 212 282" style="height:{hoogte * s.schaal}px" role="img" aria-label={wie}>
  <defs>
    <radialGradient id="{id}-huid" cx="0.35" cy="0.3" r="0.9">
      <stop offset="0" stop-color={s.licht} />
      <stop offset="0.6" stop-color={s.huid} />
      <stop offset="1" stop-color={s.donker} />
    </radialGradient>
    <radialGradient id="{id}-peach" cx="0.4" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#ffe8c8" />
      <stop offset="1" stop-color={PEACH_SCHADUW} />
    </radialGradient>
    <radialGradient id="{id}-wit" cx="0.35" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#fff" />
      <stop offset="1" stop-color="#cbd5e1" />
    </radialGradient>
    {#if kl.schoen === 'regenboogschoenen'}
      <linearGradient id="{id}-schoen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ef4444" /><stop offset="0.25" stop-color="#f59e0b" /><stop offset="0.5" stop-color="#22c55e" />
        <stop offset="0.75" stop-color="#3b82f6" /><stop offset="1" stop-color="#a855f7" />
      </linearGradient>
    {:else}
      <linearGradient id="{id}-schoen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color={schoen[0]} />
        <stop offset="1" stop-color={schoen[1]} />
      </linearGradient>
    {/if}
    <linearGradient id="{id}-lens" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a5f3fc" />
      <stop offset="0.5" stop-color="#06b6d4" />
      <stop offset="1" stop-color="#7c3aed" />
    </linearGradient>
    <linearGradient id="{id}-goud" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff4c2" />
      <stop offset="0.5" stop-color="#f2b632" />
      <stop offset="1" stop-color="#a1620b" />
    </linearGradient>
    <filter id="{id}-lijn" x="-15%" y="-15%" width="130%" height="130%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="dik" />
      <feFlood flood-color="#0a1540" result="kleur" />
      <feComposite in="kleur" in2="dik" operator="in" result="rand" />
      <feMerge><feMergeNode in="rand" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  <ellipse cx="100" cy="266" rx="56" ry="7" fill="#000" opacity="0.3" />

  <g filter="url(#{id}-lijn)">
    <g class="lijf">
      <!-- ============ KLEDING OP DE RUG ============ -->
      {#if kl.rug === 'cape'}
        <path class="cape" d="M74 150 C56 190 40 230 34 258 C70 270 130 270 166 258 C160 230 144 190 126 150 Z" fill="#dc2626" />
        <path d="M74 150 C60 190 50 226 46 252" stroke="#991b1b" stroke-width="4" fill="none" opacity="0.6" />
      {:else if kl.rug === 'vleugels'}
        <g class="vleugels">
          <path d="M80 160 C40 120 4 128 -2 150 C20 150 22 166 8 176 C30 176 36 190 24 202 C54 196 72 182 82 172 Z" fill="#f0f9ff" />
          <path d="M120 160 C160 120 196 128 202 150 C180 150 178 166 192 176 C170 176 164 190 176 202 C146 196 128 182 118 172 Z" fill="#f0f9ff" />
        </g>
      {:else if kl.rug === 'rugzak'}
        <rect x="58" y="150" width="84" height="74" rx="20" fill="#16a34a" />
        <rect x="70" y="190" width="60" height="26" rx="8" fill="#15803d" />
      {/if}

      <!-- ============ ACHTERKANT: STEKELS EN STAARTEN ============ -->
      {#if wie === 'sonic'}
        <path d="M52 78 C30 62 8 66 -2 74 C16 76 24 84 30 92 C12 92 2 100 -4 112 C16 108 28 112 40 120 C30 132 26 142 24 154 C44 140 58 138 70 142 Z" fill="url(#{id}-huid)" />
        <path d="M70 60 C60 36 44 24 30 22 C38 36 40 46 44 62 Z" fill="url(#{id}-huid)" />
        <path d="M96 150 C70 160 56 178 54 198 C72 184 86 180 100 184 Z" fill="url(#{id}-huid)" />
      {:else if wie === 'tails'}
        <g class="staart staart-1">
          <path d="M76 214 C40 220 10 200 6 164 C4 140 24 128 34 144 C40 156 38 172 54 182 C62 188 74 192 82 198 Z" fill="url(#{id}-huid)" />
          <path d="M6 164 C4 140 24 128 34 144 C26 142 12 148 6 164 Z" fill="url(#{id}-wit)" />
        </g>
        <g class="staart staart-2">
          <path d="M86 222 C54 244 14 244 2 214 C-2 196 12 184 24 194 C32 202 30 214 44 220 C56 226 74 224 86 214 Z" fill="url(#{id}-huid)" />
          <path d="M2 214 C-2 196 12 184 24 194 C14 194 4 202 2 214 Z" fill="url(#{id}-wit)" />
        </g>
      {:else}
        <path d="M56 72 C36 60 22 64 14 72 C30 74 36 82 40 92 C26 94 16 102 12 112 C30 108 42 112 52 118 Z" fill="url(#{id}-huid)" />
        <path d="M148 72 C168 60 182 64 190 72 C174 74 168 82 164 92 C178 94 188 102 192 112 C174 108 162 112 152 118 Z" fill="url(#{id}-huid)" />
      {/if}

      <!-- ============ BENEN EN SCHOENEN ============ -->
      <rect x="76" y="206" width="22" height="34" rx="9" fill="url(#{id}-huid)" />
      <rect x="102" y="206" width="22" height="34" rx="9" fill="url(#{id}-huid)" />
      <!-- sokken -->
      <rect x="75" y="226" width="24" height="14" rx="5" fill="url(#{id}-wit)" />
      <rect x="101" y="226" width="24" height="14" rx="5" fill="url(#{id}-wit)" />
      <!-- schoenen: groot en stoer -->
      <path d="M62 242 C62 232 92 230 100 238 L102 262 C84 268 64 266 60 258 Z" fill="url(#{id}-schoen)" />
      <path d="M138 242 C138 232 108 230 100 238 L98 262 C116 268 136 266 140 258 Z" fill="url(#{id}-schoen)" />
      <path d="M62 252 L100 250 M138 252 L100 250" stroke="#fff" stroke-width="5" stroke-linecap="round" />
      <rect x="76" y="238" width="14" height="9" rx="3" fill="url(#{id}-goud)" />
      <rect x="110" y="238" width="14" height="9" rx="3" fill="url(#{id}-goud)" />
      <path d="M64 262 C78 266 92 266 100 262 M136 262 C122 266 108 266 100 262" stroke="#fff" stroke-width="3.5" fill="none" opacity="0.9" />

      <!-- ============ LIJF ============ -->
      <ellipse cx="100" cy="184" rx="34" ry="38" fill="url(#{id}-huid)" />
      {#if wie === 'knuckles'}
        <ellipse cx="100" cy="190" rx="20" ry="26" fill="url(#{id}-peach)" />
        <path d="M82 156 C86 168 114 168 118 156 C110 176 90 176 82 156 Z" fill="#fff" />
      {:else}
        <ellipse cx="100" cy="192" rx="21" ry="27" fill="url(#{id}-peach)" />
      {/if}
      {#if wie === 'tails'}
        <ellipse cx="100" cy="192" rx="21" ry="27" fill="url(#{id}-wit)" />
      {/if}

      {#if kl.rug === 'rugzak'}
        <path d="M80 152 C76 172 78 196 84 214 M120 152 C124 172 122 196 116 214" stroke="#15803d" stroke-width="7" fill="none" stroke-linecap="round" />
      {:else if kl.rug === 'cape'}
        <path d="M76 152 C88 162 112 162 124 152" stroke="#dc2626" stroke-width="8" fill="none" stroke-linecap="round" />
        <circle cx="100" cy="160" r="6" fill="url(#{id}-goud)" />
      {/if}

      <!-- ============ LINKERARM ============ -->
      <g class="arm-links">
        <path d="M72 158 C56 168 50 186 52 204" stroke="url(#{id}-huid)" stroke-width="16" stroke-linecap="round" fill="none" />
        <circle cx="52" cy="210" r={wie === 'knuckles' ? 20 : 15} fill="url(#{id}-wit)" />
        {#if wie === 'knuckles'}
          <path d="M40 200 l-6 -9 l11 3 M48 195 l-3 -11 l9 6 M58 195 l3 -11 l5 9" fill="#e2e8f0" stroke="#64748b" stroke-width="1.4" />
          <rect x="34" y="214" width="36" height="7" rx="3" fill="#e2e8f0" />
        {:else}
          <path d="M42 204 q10 -6 20 0" stroke="#94a3b8" stroke-width="1.6" fill="none" />
        {/if}
      </g>

      <!-- ============ NEK EN HOOFD ============ -->
      <g class="hoofd">
        <!-- oren -->
        {#if wie === 'sonic'}
          <path d="M56 64 L58 22 L90 52 Z" fill="url(#{id}-huid)" />
          <path d="M144 64 L142 22 L110 52 Z" fill="url(#{id}-huid)" />
          <path d="M62 56 L64 34 L82 52 Z" fill="url(#{id}-peach)" />
          <path d="M138 56 L136 34 L118 52 Z" fill="url(#{id}-peach)" />
        {:else if wie === 'tails'}
          <path d="M52 66 L48 8 L94 50 Z" fill="url(#{id}-huid)" />
          <path d="M148 66 L152 8 L106 50 Z" fill="url(#{id}-huid)" />
          <path d="M58 56 L56 26 L82 50 Z" fill="url(#{id}-wit)" />
          <path d="M142 56 L144 26 L118 50 Z" fill="url(#{id}-wit)" />
        {:else}
          <path d="M60 66 C54 44 64 30 72 34 C76 44 80 52 86 58 Z" fill="url(#{id}-huid)" />
          <path d="M140 66 C146 44 136 30 128 34 C124 44 120 52 114 58 Z" fill="url(#{id}-huid)" />
        {/if}

        <!-- hoofd -->
        <ellipse cx="100" cy="96" rx="56" ry="52" fill="url(#{id}-huid)" />
        {#if wie === 'knuckles'}
          <!-- stekeltjes bovenop -->
          <path d="M70 52 L62 26 L84 46 Z M88 46 L88 18 L106 44 Z M108 44 L120 18 L130 48 Z" fill="url(#{id}-huid)" />
        {/if}
        {#if wie === 'tails'}
          <!-- witte wangen en kuif -->
          <path d="M48 104 C60 96 66 106 76 100 C70 112 58 118 48 120 Z M152 104 C140 96 134 106 124 100 C130 112 142 118 152 120 Z" fill="url(#{id}-wit)" />
        {/if}

        <!-- snuit -->
        <ellipse cx="100" cy="116" rx="34" ry="26" fill={wie === 'tails' ? 'url(#' + id + '-wit)' : 'url(#' + id + '-peach)'} />
        <ellipse cx="100" cy="106" rx="9" ry="6.5" fill="#0a1540" />
        <ellipse cx="97" cy="104" rx="3" ry="1.8" fill="#fff" opacity="0.7" />

        <!-- ogen -->
        <g class="ogen">
          <ellipse cx="80" cy="84" rx="19" ry="23" fill="#fff" />
          <ellipse cx="120" cy="84" rx="19" ry="23" fill="#fff" />
          <ellipse cx="86" cy="87" rx="10" ry="13" fill={s.iris} />
          <ellipse cx="114" cy="87" rx="10" ry="13" fill={s.iris} />
          <ellipse cx="87" cy="88" rx="5" ry="7.5" fill="#0a1540" />
          <ellipse cx="113" cy="88" rx="5" ry="7.5" fill="#0a1540" />
          <circle cx="84" cy="82" r="3.2" fill="#fff" />
          <circle cx="110" cy="82" r="3.2" fill="#fff" />
          <!-- de blik: zelfverzekerd, schuine wenkbrauwen -->
          {#if wie === 'knuckles'}
            <path d="M58 70 L96 80 M142 70 L104 80" stroke={s.donker} stroke-width="7" stroke-linecap="round" />
          {:else if stemming === 'denk'}
            <path d="M62 66 Q80 60 96 68 M138 62 Q120 58 104 66" stroke={s.donker} stroke-width="5" fill="none" stroke-linecap="round" />
          {:else}
            <path d="M60 70 Q78 60 96 68 M140 70 Q122 60 104 68" stroke={s.donker} stroke-width="5" fill="none" stroke-linecap="round" />
          {/if}
        </g>

        <!-- mond -->
        {#if zingt}
          <path d="M80 122 Q100 148 120 122 Q100 128 80 122 Z" fill="#7f1d1d" />
          <path d="M84 124 Q100 130 116 124 L114 128 Q100 133 86 128 Z" fill="#fff" />
          <ellipse cx="100" cy="137" rx="9" ry="4.5" fill="#f87171" />
        {:else if stemming === 'denk'}
          <ellipse cx="102" cy="126" rx="5" ry="6" fill="#7f1d1d" />
        {:else}
          <path d="M82 122 Q100 138 118 122" stroke="#0a1540" stroke-width="4" fill="none" stroke-linecap="round" />
          <path d="M118 122 l5 -3" stroke="#0a1540" stroke-width="3.5" stroke-linecap="round" />
        {/if}

        <!-- ============ BRIL ============ -->
        {#if kl.bril === 'zonnebril'}
          <path d="M44 78 L60 76 M156 78 L140 76" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
          <rect x="58" y="70" width="38" height="28" rx="11" fill="#0f172a" />
          <rect x="104" y="70" width="38" height="28" rx="11" fill="#0f172a" />
          <path d="M96 80 Q100 76 104 80" stroke="#0f172a" stroke-width="5" fill="none" />
          <path d="M64 76 L76 76 M110 76 L122 76" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        {:else if kl.bril === 'skibril'}
          <rect x="42" y="74" width="116" height="14" rx="6" fill="#f97316" />
          <rect x="56" y="64" width="88" height="40" rx="18" fill="url(#{id}-lens)" stroke="#e2e8f0" stroke-width="5" />
          <path d="M66 72 L84 72" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.8" />
        {/if}

        <!-- ============ HOOFDDEKSEL ============ -->
        {#if kl.hoofd === 'pet'}
          <path d="M50 66 C50 18 150 18 150 66 Z" fill="#2563eb" />
          <path d="M50 66 C30 64 18 70 22 76 C40 78 60 74 76 68 Z" fill="#1d4ed8" />
          <circle cx="100" cy="28" r="5" fill="#1e3a8a" />
          <path d="M84 44 L116 44" stroke="#fde047" stroke-width="5" stroke-linecap="round" />
        {:else if kl.hoofd === 'feestmuts'}
          <path d="M74 52 L104 -6 L128 50 Z" fill="#ec4899" />
          <path d="M84 34 L120 34 M92 18 L112 18" stroke="#fde047" stroke-width="5" />
          <circle cx="104" cy="-8" r="8" fill="#fde047" />
        {:else if kl.hoofd === 'koptelefoon'}
          <path d="M44 96 C40 20 160 20 156 96" stroke="#475569" stroke-width="10" fill="none" stroke-linecap="round" />
          <rect x="30" y="76" width="22" height="40" rx="10" fill="#ef4444" />
          <rect x="148" y="76" width="22" height="40" rx="10" fill="#ef4444" />
        {:else if kl.hoofd === 'cowboyhoed'}
          <ellipse cx="100" cy="50" rx="82" ry="14" fill="#92400e" />
          <path d="M60 50 C58 4 142 4 140 50 Z" fill="#a16207" />
          <rect x="60" y="36" width="80" height="10" fill="#7c2d12" />
          <path d="M100 12 L100 36" stroke="#7c2d12" stroke-width="4" opacity="0.5" />
        {:else if kl.hoofd === 'kroon'}
          <path d="M58 54 L62 14 L80 34 L100 2 L120 34 L138 14 L142 54 Z" fill="url(#{id}-goud)" />
          <circle cx="100" cy="40" r="7" fill="#ef4444" />
          <circle cx="76" cy="44" r="5" fill="#3b82f6" />
          <circle cx="124" cy="44" r="5" fill="#22c55e" />
        {/if}
      </g>

      <!-- ============ RECHTERARM ============ -->
      <g class="arm-rechts">
        <path d="M128 158 C144 168 150 186 148 204" stroke="url(#{id}-huid)" stroke-width="16" stroke-linecap="round" fill="none" />
        <circle cx="148" cy="210" r={wie === 'knuckles' ? 20 : 15} fill="url(#{id}-wit)" />
        {#if wie === 'knuckles'}
          <path d="M160 200 l6 -9 l-11 3 M152 195 l3 -11 l-9 6 M142 195 l-3 -11 l-5 9" fill="#e2e8f0" stroke="#64748b" stroke-width="1.4" />
          <rect x="130" y="214" width="36" height="7" rx="3" fill="#e2e8f0" />
        {:else}
          <path d="M138 204 q10 -6 20 0" stroke="#94a3b8" stroke-width="1.6" fill="none" />
        {/if}
      </g>
    </g>
  </g>
</svg>

<style>
  .held {
    overflow: visible;
    filter: drop-shadow(0 8px 18px rgba(0, 0, 40, 0.45));
  }
  .held.goud {
    filter: sepia(1) saturate(4.5) hue-rotate(-10deg) brightness(1.15) drop-shadow(0 0 18px rgba(253, 224, 71, 0.95));
  }
  .lijf {
    transform-origin: 100px 262px;
    transform-box: view-box;
  }
  .rust .lijf {
    animation: wieg 3s ease-in-out infinite;
  }
  .dans .lijf {
    animation: dans 0.8s ease-in-out infinite;
  }
  .juich .lijf {
    animation: spring 0.6s ease-in-out infinite;
  }
  .hoofd {
    transform-origin: 100px 130px;
    transform-box: view-box;
    transition: transform 0.4s;
  }
  .denk .hoofd {
    transform: rotate(-7deg);
  }
  .arm-links {
    transform-origin: 72px 158px;
    transform-box: view-box;
  }
  .arm-rechts {
    transform-origin: 128px 158px;
    transform-box: view-box;
  }
  .juich .arm-rechts,
  .dans .arm-rechts {
    animation: zwaai 0.6s ease-in-out infinite alternate;
  }
  .juich .arm-links {
    animation: zwaai-links 0.6s ease-in-out infinite alternate;
  }
  .staart {
    transform-box: view-box;
    animation: slinger 1.6s ease-in-out infinite;
  }
  .staart-1 { transform-origin: 80px 212px; }
  .staart-2 { transform-origin: 86px 218px; animation-direction: reverse; }
  .juich .staart,
  .dans .staart {
    animation-duration: 0.5s;
  }
  .ogen {
    transform-origin: 100px 86px;
    transform-box: view-box;
    animation: knipper 5s infinite;
  }
  @keyframes wieg {
    0%, 100% { transform: rotate(-1.2deg); }
    50% { transform: rotate(1.2deg) translateY(-3px); }
  }
  @keyframes dans {
    0%, 100% { transform: rotate(-4deg) translateY(0); }
    50% { transform: rotate(4deg) translateY(-12px); }
  }
  @keyframes spring {
    0%, 100% { transform: translateY(0); }
    40% { transform: translateY(-28px); }
  }
  @keyframes zwaai {
    from { transform: rotate(0deg); }
    to { transform: rotate(-150deg); }
  }
  @keyframes zwaai-links {
    from { transform: rotate(0deg); }
    to { transform: rotate(20deg); }
  }
  @keyframes slinger {
    0%, 100% { transform: rotate(-9deg); }
    50% { transform: rotate(9deg); }
  }
  @keyframes knipper {
    0%, 95%, 100% { transform: scaleY(1); }
    97% { transform: scaleY(0.1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .lijf, .arm-rechts, .arm-links, .ogen, .staart { animation: none !important; }
  }
</style>
