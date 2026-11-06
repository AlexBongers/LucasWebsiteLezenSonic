<script lang="ts">
  /** Ronde knop die iets laat voorlezen. */
  let { opTik, label = 'Voorlezen', klein = false }: { opTik: () => Promise<void> | void; label?: string; klein?: boolean } = $props();
  let bezig = $state(false);
  async function tik(e: Event) {
    e.stopPropagation();
    bezig = true;
    try {
      await opTik();
    } finally {
      bezig = false;
    }
  }
</script>

<button class="knop-rond luidspreker" class:bezig class:klein aria-label={label} onclick={tik}>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff" />
    <path class="golf g1" d="M16 9.5a3.5 3.5 0 0 1 0 5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" />
    <path class="golf g2" d="M18.5 7a7 7 0 0 1 0 10" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" />
  </svg>
</button>

<style>
  .luidspreker svg {
    width: 36px;
    height: 36px;
  }
  .klein {
    width: 52px;
    height: 52px;
  }
  .klein svg {
    width: 28px;
    height: 28px;
  }
  .bezig {
    background: rgba(251, 191, 36, 0.4);
    border-color: #fde68a;
  }
  .bezig .g1 {
    animation: golf 0.8s ease-in-out infinite;
  }
  .bezig .g2 {
    animation: golf 0.8s ease-in-out 0.2s infinite;
  }
  @keyframes golf {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 1; }
  }
</style>
